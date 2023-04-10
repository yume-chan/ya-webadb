import {
    Breadcrumb,
    ContextualMenu,
    ContextualMenuItem,
    DetailsListLayoutMode,
    Dialog,
    DirectionalHint,
    IBreadcrumbItem,
    IColumn,
    IContextualMenuItem,
    IDetailsHeaderProps,
    IRenderFunction,
    Icon,
    Layer,
    MarqueeSelection,
    Overlay,
    ProgressIndicator,
    Selection,
    ShimmeredDetailsList,
    Stack,
    StackItem,
    concatStyleSets,
    mergeStyleSets,
} from "@fluentui/react";
import {
    FileIconType,
    getFileTypeIconProps,
    initializeFileTypeIcons,
} from "@fluentui/react-file-type-icons";
import { useConst } from "@fluentui/react-hooks";
import { getIcon } from "@fluentui/style-utilities";
import {
    AdbFeature,
    AdbSync,
    LinuxFileType,
    type AdbSyncEntry,
} from "@yume-chan/adb";
import { WrapConsumableStream, WritableStream } from "@yume-chan/stream-extra";
import { EMPTY_UINT8_ARRAY } from "@yume-chan/struct";
import { Zip, ZipPassThrough } from "fflate";
import {
    action,
    autorun,
    makeAutoObservable,
    observable,
    runInAction,
} from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import Router, { useRouter } from "next/router";
import path from "path";
import { useCallback, useEffect, useState } from "react";
import { CommandBar, NoSsr } from "../components";
import { GLOBAL_STATE } from "../state";
import {
    Icons,
    ProgressStream,
    RouteStackProps,
    asyncEffect,
    createFileStream,
    formatSize,
    formatSpeed,
    pickFile,
    saveFile,
} from "../utils";

initializeFileTypeIcons();

interface ListItem extends AdbSyncEntry {
    key: string;
}

function toListItem(item: AdbSyncEntry): ListItem {
    (item as ListItem).key = item.name;
    return item as ListItem;
}

const classNames = mergeStyleSets({
    name: {
        cursor: "pointer",
        "&:hover": {
            textDecoration: "underline",
        },
    },
});

const renderDetailsHeader: IRenderFunction<IDetailsHeaderProps> = (
    props?,
    defaultRender?
) => {
    if (!props || !defaultRender) {
        return null;
    }

    return defaultRender({
        ...props,
        styles: concatStyleSets(props.styles, { root: { paddingTop: 0 } }),
    });
};

function compareCaseInsensitively(a: string, b: string) {
    let result = a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
    if (result !== 0) {
        return result;
    } else {
        return a.localeCompare(b);
    }
}

class FileManagerState {
    initial = true;
    visible = false;
    path = "/";
    loading = false;
    items: ListItem[] = [];
    sortKey: keyof ListItem = "name";
    sortDescending = false;

    uploading = false;
    uploadPath: string | undefined = undefined;
    uploadedSize = 0;
    uploadTotalSize = 0;
    debouncedUploadedSize = 0;
    uploadSpeed = 0;

    selectedItems: ListItem[] = [];
    contextMenuTarget: MouseEvent | undefined = undefined;

    get breadcrumbItems(): IBreadcrumbItem[] {
        let part = "";
        const list: IBreadcrumbItem[] = this.path
            .split("/")
            .filter(Boolean)
            .map((segment) => {
                part += "/" + segment;
                return {
                    key: part,
                    text: segment,
                    onClick: (e, item) => {
                        if (!item) {
                            return;
                        }
                        this.pushPathQuery(item.key);
                    },
                };
            });
        list.unshift({
            key: "/",
            text: "Device",
            onClick: () => this.pushPathQuery("/"),
        });
        list[list.length - 1].isCurrentItem = true;
        delete list[list.length - 1].onClick;
        return list;
    }

    get menuItems() {
        let result: IContextualMenuItem[] = [];

        switch (this.selectedItems.length) {
            case 0:
                result.push({
                    key: "upload",
                    text: "Upload",
                    iconProps: {
                        iconName: Icons.CloudArrowUp,
                        style: { height: 20, fontSize: 20, lineHeight: 1.5 },
                    },
                    disabled: !GLOBAL_STATE.device,
                    onClick: () => {
                        (async () => {
                            const files = await pickFile({ multiple: true });
                            for (let i = 0; i < files.length; i++) {
                                const file = files.item(i)!;
                                await this.upload(file);
                            }
                        })();

                        return false;
                    },
                });
                break;
            default:
                result.push(
                    {
                        key: "download",
                        text: "Download",
                        iconProps: {
                            iconName: Icons.CloudArrowDown,
                            style: {
                                height: 20,
                                fontSize: 20,
                                lineHeight: 1.5,
                            },
                        },
                        onClick: () => {
                            void this.download();
                            return false;
                        },
                    },
                    {
                        key: "delete",
                        text: "Delete",
                        iconProps: {
                            iconName: Icons.Delete,
                            style: {
                                height: 20,
                                fontSize: 20,
                                lineHeight: 1.5,
                            },
                        },
                        onClick: () => {
                            (async () => {
                                try {
                                    for (const item of this.selectedItems) {
                                        const output =
                                            await GLOBAL_STATE.device!.rm(
                                                path.resolve(
                                                    this.path,
                                                    item.name!
                                                )
                                            );
                                        if (output) {
                                            GLOBAL_STATE.showErrorDialog(
                                                output
                                            );
                                            return;
                                        }
                                    }
                                } catch (e: any) {
                                    GLOBAL_STATE.showErrorDialog(e);
                                } finally {
                                    this.loadFiles();
                                }
                            })();
                            return false;
                        },
                    }
                );
                break;
        }

        return result;
    }

    get sortedList() {
        const list = this.items.slice();
        list.sort((a, b) => {
            const aIsFile = a.type === LinuxFileType.File ? 1 : 0;
            const bIsFile = b.type === LinuxFileType.File ? 1 : 0;

            let result: number;
            if (aIsFile !== bIsFile) {
                result = aIsFile - bIsFile;
            } else {
                const aSortKey = a[this.sortKey]!;
                const bSortKey = b[this.sortKey]!;

                if (aSortKey === bSortKey) {
                    // use name as tie breaker
                    result = compareCaseInsensitively(a.name!, b.name!);
                } else if (typeof aSortKey === "string") {
                    result = compareCaseInsensitively(
                        aSortKey,
                        bSortKey as string
                    );
                } else {
                    result =
                        (aSortKey as number) < (bSortKey as number) ? -1 : 1;
                }
            }

            if (this.sortDescending) {
                result *= -1;
            }
            return result;
        });
        return list;
    }

    get columns(): IColumn[] {
        const ICON_SIZE = 20;

        const list: IColumn[] = [
            {
                key: "type",
                name: "File Type",
                iconName: Icons.Document20,
                isIconOnly: true,
                minWidth: ICON_SIZE,
                maxWidth: ICON_SIZE,
                isCollapsible: true,
                onRender(item: AdbSyncEntry) {
                    let iconName: string;

                    switch (item.type) {
                        case LinuxFileType.Link:
                            // larger sizes of `linkedFolder` icon now have a person symbol on it,
                            // We want to use it for symbolic links, so use the 16px version
                            // cspell:disable-next-line
                            iconName = "linkedfolder16_svg";
                            break;
                        case LinuxFileType.Directory:
                            ({ iconName } = getFileTypeIconProps({
                                type: FileIconType.folder,
                            }));
                            break;
                        case LinuxFileType.File:
                            ({ iconName } = getFileTypeIconProps({
                                extension: path.extname(item.name!),
                            }));
                            break;
                        default:
                            ({ iconName } = getFileTypeIconProps({
                                type: FileIconType.genericFile,
                            }));
                            break;
                    }

                    // `@fluentui/react-file-type-icons` doesn't export icon src.
                    const iconSrc = (
                        getIcon(iconName)!.code as unknown as JSX.Element
                    ).props.src;
                    return (
                        <Icon
                            imageProps={{
                                crossOrigin: "anonymous",
                                src: iconSrc,
                            }}
                            style={{ width: ICON_SIZE, height: ICON_SIZE }}
                        />
                    );
                },
            },
            {
                key: "name",
                name: "Name",
                minWidth: 0,
                isRowHeader: true,
                onRender(item: AdbSyncEntry) {
                    return (
                        <span className={classNames.name} data-selection-invoke>
                            {item.name}
                        </span>
                    );
                },
            },
            {
                key: "permission",
                name: "Permission",
                minWidth: 0,
                isCollapsible: true,
                onRender(item: AdbSyncEntry) {
                    return `${((item.mode >> 6) & 0b100).toString(8)}${(
                        (item.mode >> 3) &
                        0b100
                    ).toString(8)}${(item.mode & 0b100).toString(8)}`;
                },
            },
            {
                key: "size",
                name: "Size",
                minWidth: 0,
                isCollapsible: true,
                onRender(item: AdbSyncEntry) {
                    if (item.type === LinuxFileType.File) {
                        return formatSize(Number(item.size));
                    }
                    return "";
                },
            },
            {
                key: "mtime",
                name: "Last Modified Time",
                minWidth: 150,
                isCollapsible: true,
                onRender(item: AdbSyncEntry) {
                    return new Date(Number(item.mtime) * 1000).toLocaleString();
                },
            },
        ];

        if (GLOBAL_STATE.device?.supportsFeature(AdbFeature.ListV2)) {
            list.push(
                {
                    key: "ctime",
                    name: "Creation Time",
                    minWidth: 150,
                    isCollapsible: true,
                    onRender(item: AdbSyncEntry) {
                        return new Date(
                            Number(item.ctime!) * 1000
                        ).toLocaleString();
                    },
                },
                {
                    key: "atime",
                    name: "Last Access Time",
                    minWidth: 150,
                    isCollapsible: true,
                    onRender(item: AdbSyncEntry) {
                        return new Date(
                            Number(item.atime!) * 1000
                        ).toLocaleString();
                    },
                }
            );
        }

        for (const item of list) {
            item.onColumnClick = (e, column) => {
                if (this.sortKey === column.key) {
                    runInAction(
                        () => (this.sortDescending = !this.sortDescending)
                    );
                } else {
                    runInAction(() => {
                        this.sortKey = column.key as keyof ListItem;
                        this.sortDescending = false;
                    });
                }
            };

            if (item.key === this.sortKey) {
                item.isSorted = true;
                item.isSortedDescending = this.sortDescending;
            }
        }

        return list;
    }

    constructor() {
        makeAutoObservable(this, {
            initial: false,
            items: observable.shallow,
            pushPathQuery: false,
            changeDirectory: action.bound,
            loadFiles: false,
        });

        autorun(() => {
            if (GLOBAL_STATE.device) {
                if (this.initial && this.visible) {
                    this.initial = false;
                    this.loadFiles();
                }
            } else {
                this.initial = true;
            }
        });
    }

    private getFileStream(sync: AdbSync, basePath: string, name: string) {
        return sync.read(path.resolve(basePath, name));
    }

    private async addDirectory(
        sync: AdbSync,
        zip: Zip,
        basePath: string,
        relativePath: string
    ) {
        if (relativePath !== ".") {
            // Add empty directory
            const file = new ZipPassThrough(relativePath + "/");
            zip.add(file);
            file.push(EMPTY_UINT8_ARRAY, true);
        }

        for (const entry of await sync.readdir(
            path.resolve(basePath, relativePath)
        )) {
            if (entry.name === "." || entry.name === "..") {
                continue;
            }

            switch (entry.type) {
                case LinuxFileType.Directory:
                    await this.addDirectory(
                        sync,
                        zip,
                        basePath,
                        path.resolve(relativePath, entry.name)
                    );
                    break;
                case LinuxFileType.File:
                    await this.addFile(
                        sync,
                        zip,
                        basePath,
                        path.resolve(relativePath, entry.name)
                    );
                    break;
            }
        }
    }

    private async addFile(
        sync: AdbSync,
        zip: Zip,
        basePath: string,
        name: string
    ) {
        const file = new ZipPassThrough(name);
        zip.add(file);
        await this.getFileStream(sync, basePath, name).pipeTo(
            new WritableStream({
                write(chunk) {
                    file.push(chunk);
                },
                close() {
                    file.push(EMPTY_UINT8_ARRAY, true);
                },
            })
        );
    }

    private async download() {
        const sync = await GLOBAL_STATE.device!.sync();
        try {
            if (this.selectedItems.length === 1) {
                const item = this.selectedItems[0];
                switch (item.type) {
                    case LinuxFileType.Directory: {
                        const stream = saveFile(
                            `${this.selectedItems[0].name}.zip`
                        );
                        const writer = stream.getWriter();
                        const zip = new Zip((err, data, final) => {
                            writer.write(data);
                            if (final) {
                                writer.close();
                            }
                        });
                        await this.addDirectory(
                            sync,
                            zip,
                            path.resolve(this.path, item.name),
                            "."
                        );
                        zip.end();
                        break;
                    }
                    case LinuxFileType.File:
                        await this.getFileStream(
                            sync,
                            this.path,
                            item.name
                        ).pipeTo(saveFile(item.name, Number(item.size)));
                        break;
                }
                return;
            }

            const stream = saveFile(`${path.basename(this.path)}.zip`);
            const writer = stream.getWriter();
            const zip = new Zip((err, data, final) => {
                writer.write(data);
                if (final) {
                    writer.close();
                }
            });
            for (const item of this.selectedItems) {
                switch (item.type) {
                    case LinuxFileType.Directory:
                        await this.addDirectory(
                            sync,
                            zip,
                            this.path,
                            item.name
                        );
                        break;
                    case LinuxFileType.File:
                        await this.addFile(sync, zip, this.path, item.name);
                        break;
                }
            }
            zip.end();
        } catch (e: any) {
            GLOBAL_STATE.showErrorDialog(e);
        } finally {
            sync.dispose();
        }
    }

    pushPathQuery = (path: string) => {
        Router.push({ query: { ...Router.query, path } });
    };

    changeDirectory(path: string) {
        if (this.path === path) {
            return;
        }

        this.path = path;

        if (!GLOBAL_STATE.device) {
            return;
        }

        this.loadFiles();
    }

    loadFiles = asyncEffect(async (signal) => {
        const currentPath = this.path;

        runInAction(() => (this.items = []));

        if (!GLOBAL_STATE.device) {
            return;
        }

        runInAction(() => (this.loading = true));

        const sync = await GLOBAL_STATE.device.sync();

        const items: ListItem[] = [];
        const linkItems: AdbSyncEntry[] = [];
        const intervalId = setInterval(() => {
            if (signal.aborted) {
                return;
            }

            runInAction(() => (this.items = items.slice()));
        }, 1000);

        try {
            for await (const entry of sync.opendir(currentPath)) {
                if (signal.aborted) {
                    return;
                }

                if (entry.name === "." || entry.name === "..") {
                    continue;
                }

                if (entry.type === LinuxFileType.Link) {
                    linkItems.push(entry);
                } else {
                    items.push(toListItem(entry));
                }
            }

            for (const entry of linkItems) {
                if (signal.aborted) {
                    return;
                }

                if (
                    !(await sync.isDirectory(
                        path.resolve(currentPath, entry.name!)
                    ))
                ) {
                    entry.mode = (LinuxFileType.File << 12) | entry.permission;
                    entry.size = 0n;
                }

                items.push(toListItem(entry));
            }

            if (signal.aborted) {
                return;
            }

            runInAction(() => (this.items = items));
        } finally {
            if (!signal.aborted) {
                runInAction(() => (this.loading = false));
            }
            clearInterval(intervalId);
            sync.dispose();
        }
    });

    upload = async (file: File) => {
        const sync = await GLOBAL_STATE.device!.sync();
        try {
            const itemPath = path.resolve(this.path!, file.name);
            runInAction(() => {
                this.uploading = true;
                this.uploadPath = file.name;
                this.uploadedSize = 0;
                this.uploadTotalSize = file.size;
                this.debouncedUploadedSize = 0;
                this.uploadSpeed = 0;
            });

            const intervalId = setInterval(
                action(() => {
                    this.uploadSpeed =
                        this.uploadedSize - this.debouncedUploadedSize;
                    this.debouncedUploadedSize = this.uploadedSize;
                }),
                1000
            );

            try {
                const start = Date.now();

                await sync.write({
                    filename: itemPath,
                    file: createFileStream(file)
                        .pipeThrough(new WrapConsumableStream())
                        .pipeThrough(
                            new ProgressStream(
                                action((uploaded) => {
                                    this.uploadedSize = uploaded;
                                })
                            )
                        ),
                    type: LinuxFileType.File,
                    permission: 0o666,
                    mtime: file.lastModified / 1000,
                });

                console.log(
                    "Upload speed:",
                    (
                        ((file.size / (Date.now() - start)) * 1000) /
                        1024 /
                        1024
                    ).toFixed(2),
                    "MB/s"
                );

                runInAction(() => {
                    this.uploadSpeed =
                        this.uploadedSize - this.debouncedUploadedSize;
                    this.debouncedUploadedSize = this.uploadedSize;
                });
            } finally {
                clearInterval(intervalId);
            }
        } catch (e: any) {
            GLOBAL_STATE.showErrorDialog(e);
        } finally {
            sync.dispose();
            this.loadFiles();
            runInAction(() => {
                this.uploading = false;
            });
        }
    };
}

const state = new FileManagerState();

const UploadDialog = observer(() => {
    return (
        <Dialog
            hidden={!state.uploading}
            dialogContentProps={{
                title: "Uploading...",
                subText: state.uploadPath,
            }}
        >
            <ProgressIndicator
                description={formatSpeed(
                    state.debouncedUploadedSize,
                    state.uploadTotalSize,
                    state.uploadSpeed
                )}
                percentComplete={state.uploadedSize / state.uploadTotalSize}
            />
        </Dialog>
    );
});

const FileManager: NextPage = (): JSX.Element | null => {
    useEffect(() => {
        runInAction(() => {
            state.visible = true;
        });

        return () => {
            runInAction(() => {
                state.visible = false;
            });
        };
    });

    const router = useRouter();
    useEffect(() => {
        let pathQuery = router.query.path;
        if (!pathQuery) {
            router.replace({ query: { ...router.query, path: state.path } });
            return;
        }

        if (Array.isArray(pathQuery)) {
            pathQuery = pathQuery[0];
        }

        state.changeDirectory(pathQuery);
    }, [router]);

    const [previewUrl, setPreviewUrl] = useState<string | undefined>();
    const previewImage = useCallback(async (path: string) => {
        const sync = await GLOBAL_STATE.device!.sync();
        try {
            const readable = sync.read(path);
            // @ts-ignore ReadableStream definitions are slightly incompatible
            const response = new Response(readable);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setPreviewUrl(url);
        } finally {
            sync.dispose();
        }
    }, []);
    const hidePreview = useCallback(() => {
        setPreviewUrl(undefined);
    }, []);

    const handleItemInvoked = useCallback(
        (item: AdbSyncEntry) => {
            switch (item.type) {
                case LinuxFileType.Link:
                case LinuxFileType.Directory:
                    state.pushPathQuery(path.resolve(state.path!, item.name!));
                    break;
                case LinuxFileType.File:
                    switch (path.extname(item.name!)) {
                        case ".jpg":
                        case ".png":
                        case ".svg":
                        case ".gif":
                            previewImage(path.resolve(state.path!, item.name!));
                            break;
                    }
                    break;
            }
        },
        [previewImage]
    );

    const selection = useConst(
        () =>
            new Selection({
                onSelectionChanged() {
                    runInAction(() => {
                        state.selectedItems =
                            selection.getSelection() as ListItem[];
                    });
                },
            })
    );

    const showContextMenu = useCallback(
        (item?: AdbSyncEntry, index?: number, e?: Event) => {
            if (!e) {
                return false;
            }

            if (state.menuItems.length) {
                runInAction(() => {
                    state.contextMenuTarget = e as MouseEvent;
                });
            }

            return false;
        },
        []
    );
    const hideContextMenu = useCallback(() => {
        runInAction(() => (state.contextMenuTarget = undefined));
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>File Manager - Tango</title>
            </Head>

            <CommandBar items={state.menuItems} />

            <Breadcrumb items={state.breadcrumbItems} />

            <StackItem
                grow
                styles={{
                    root: {
                        margin: "-8px -16px -16px -16px",
                        padding: "8px 16px 16px 16px",
                        overflowY: "auto",
                    },
                }}
            >
                <MarqueeSelection selection={selection}>
                    <ShimmeredDetailsList
                        items={state.sortedList}
                        columns={state.columns}
                        setKey={state.path}
                        selection={selection}
                        layoutMode={DetailsListLayoutMode.justified}
                        enableShimmer={
                            state.loading && state.items.length === 0
                        }
                        onItemInvoked={handleItemInvoked}
                        onItemContextMenu={showContextMenu}
                        onRenderDetailsHeader={renderDetailsHeader}
                        usePageCache
                        useReducedRowRenderer
                    />
                </MarqueeSelection>

                {previewUrl && (
                    <Layer>
                        <Overlay onClick={hidePreview}>
                            <div
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt=""
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                    }}
                                />
                            </div>
                        </Overlay>
                    </Layer>
                )}
            </StackItem>

            <NoSsr>
                <ContextualMenu
                    items={state.menuItems}
                    hidden={!state.contextMenuTarget}
                    directionalHint={DirectionalHint.bottomLeftEdge}
                    target={state.contextMenuTarget}
                    onDismiss={hideContextMenu}
                    contextualMenuItemAs={(props) => (
                        <ContextualMenuItem {...props} hasIcons={false} />
                    )}
                />
            </NoSsr>

            <UploadDialog />
        </Stack>
    );
};

export default observer(FileManager);
