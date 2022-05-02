import { Breadcrumb, concatStyleSets, ContextualMenu, ContextualMenuItem, DetailsListLayoutMode, Dialog, DirectionalHint, IBreadcrumbItem, IColumn, Icon, IContextualMenuItem, IDetailsHeaderProps, IRenderFunction, Layer, MarqueeSelection, mergeStyleSets, Overlay, ProgressIndicator, Selection, ShimmeredDetailsList, Stack, StackItem } from '@fluentui/react';
import { FileIconType, getFileTypeIconProps, initializeFileTypeIcons } from "@fluentui/react-file-type-icons";
import { useConst } from '@fluentui/react-hooks';
import { getIcon } from '@fluentui/style-utilities';
import { AdbFeatures, ADB_SYNC_MAX_PACKET_SIZE, ChunkStream, LinuxFileType, type AdbSyncEntry } from '@yume-chan/adb';
import { action, autorun, makeAutoObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import Router, { useRouter } from "next/router";
import path from 'path';
import { useCallback, useEffect, useState } from 'react';
import { CommandBar, NoSsr } from '../components';
import { GlobalState } from '../state';
import { asyncEffect, createFileStream, formatSize, formatSpeed, Icons, pickFile, ProgressStream, RouteStackProps, saveFile } from '../utils';

initializeFileTypeIcons();

interface ListItem extends AdbSyncEntry {
    key: string;
}

function toListItem(item: AdbSyncEntry): ListItem {
    return { ...item, key: item.name! };
}

const classNames = mergeStyleSets({
    name: {
        cursor: 'pointer',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
});

const renderDetailsHeader: IRenderFunction<IDetailsHeaderProps> = (props?, defaultRender?) => {
    if (!props || !defaultRender) {
        return null;
    }

    return defaultRender({
        ...props,
        styles: concatStyleSets(props.styles, { root: { paddingTop: 0 } })
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
    path = '/';
    loading = false;
    items: ListItem[] = [];
    sortKey: keyof ListItem = 'name';
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
        let part = '';
        const list: IBreadcrumbItem[] = this.path.split('/').filter(Boolean).map(segment => {
            part += '/' + segment;
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
            key: '/',
            text: 'Device',
            onClick: () => this.pushPathQuery('/'),
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
                    key: 'upload',
                    text: 'Upload',
                    iconProps: {
                        iconName: Icons.CloudArrowUp,
                        style: { height: 20, fontSize: 20, lineHeight: 1.5 }
                    },
                    disabled: !GlobalState.device,
                    onClick: () => {
                        (async () => {
                            const files = await pickFile({ multiple: true });
                            for (let i = 0; i < files.length; i++) {
                                const file = files.item(i)!;
                                await this.upload(file);
                            }
                        })();

                        return false;
                    }
                });
                break;
            case 1:
                if (this.selectedItems[0].type === LinuxFileType.File) {
                    result.push({
                        key: 'download',
                        text: 'Download',
                        iconProps: {
                            iconName: Icons.CloudArrowDown,
                            style: { height: 20, fontSize: 20, lineHeight: 1.5 }
                        },
                        onClick: () => {
                            (async () => {
                                const sync = await GlobalState.device!.sync();
                                try {
                                    const item = this.selectedItems[0];
                                    const itemPath = path.resolve(this.path, item.name);
                                    await sync.read(itemPath)
                                        .pipeTo(saveFile(item.name, Number(item.size)));
                                } catch (e: any) {
                                    GlobalState.showErrorDialog(e);
                                } finally {
                                    sync.dispose();
                                }
                            })();
                            return false;
                        },
                    });
                }
            // fall through
            default:
                result.push({
                    key: 'delete',
                    text: 'Delete',
                    iconProps: {
                        iconName: Icons.Delete,
                        style: { height: 20, fontSize: 20, lineHeight: 1.5 }
                    },
                    onClick: () => {
                        (async () => {
                            try {
                                for (const item of this.selectedItems) {
                                    const output = await GlobalState.device!.rm(path.resolve(this.path, item.name!));
                                    if (output) {
                                        GlobalState.showErrorDialog(output);
                                        return;
                                    }
                                }
                            } catch (e: any) {
                                GlobalState.showErrorDialog(e);
                            } finally {
                                this.loadFiles();
                            }
                        })();
                        return false;
                    }
                });
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
                    result = compareCaseInsensitively(a.name!, b.name!);
                } else if (typeof aSortKey === 'string') {
                    result = compareCaseInsensitively(aSortKey, bSortKey as string);
                } else {
                    result = aSortKey < bSortKey ? -1 : 1;
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
                key: 'type',
                name: 'File Type',
                iconName: Icons.Document20,
                isIconOnly: true,
                minWidth: ICON_SIZE,
                maxWidth: ICON_SIZE,
                isCollapsible: true,
                onRender(item: AdbSyncEntry) {
                    let iconName: string;

                    switch (item.type) {
                        case LinuxFileType.Link:
                            ({ iconName } = getFileTypeIconProps({ type: FileIconType.linkedFolder }));
                            break;
                        case LinuxFileType.Directory:
                            ({ iconName } = getFileTypeIconProps({ type: FileIconType.folder }));
                            break;
                        case LinuxFileType.File:
                            ({ iconName } = getFileTypeIconProps({ extension: path.extname(item.name!) }));
                            break;
                        default:
                            ({ iconName } = getFileTypeIconProps({ extension: 'txt' }));
                            break;
                    }

                    // `@fluentui/react-file-type-icons` doesn't export icon src.
                    const iconSrc = (getIcon(iconName)!.code as unknown as JSX.Element).props.src;
                    return <Icon imageProps={{ crossOrigin: 'anonymous', src: iconSrc }} style={{ width: ICON_SIZE, height: ICON_SIZE }} />;
                }
            },
            {
                key: 'name',
                name: 'Name',
                minWidth: 0,
                isRowHeader: true,
                onRender(item: AdbSyncEntry) {
                    return (
                        <span className={classNames.name} data-selection-invoke>
                            {item.name}
                        </span>
                    );
                }
            },
            {
                key: 'permission',
                name: 'Permission',
                minWidth: 0,
                isCollapsible: true,
                onRender(item: AdbSyncEntry) {
                    return `${(item.mode >> 6 & 0b100).toString(8)}${(item.mode >> 3 & 0b100).toString(8)}${(item.mode & 0b100).toString(8)}`;
                }
            },
            {
                key: 'size',
                name: 'Size',
                minWidth: 0,
                isCollapsible: true,
                onRender(item: AdbSyncEntry) {
                    if (item.type === LinuxFileType.File) {
                        return formatSize(Number(item.size));
                    }
                    return '';
                }
            },
            {
                key: 'mtime',
                name: 'Last Modified Time',
                minWidth: 150,
                isCollapsible: true,
                onRender(item: AdbSyncEntry) {
                    return new Date(Number(item.mtime) * 1000).toLocaleString();
                },
            }
        ];

        if (GlobalState.device?.features?.includes(AdbFeatures.ListV2)) {
            list.push(
                {
                    key: 'ctime',
                    name: 'Creation Time',
                    minWidth: 150,
                    isCollapsible: true,
                    onRender(item: AdbSyncEntry) {
                        return new Date(Number(item.ctime!) * 1000).toLocaleString();
                    },
                },
                {
                    key: 'atime',
                    name: 'Last Access Time',
                    minWidth: 150,
                    isCollapsible: true,
                    onRender(item: AdbSyncEntry) {
                        return new Date(Number(item.atime!) * 1000).toLocaleString();
                    },
                },
            );
        }

        for (const item of list) {
            item.onColumnClick = (e, column) => {
                if (this.sortKey === column.key) {
                    runInAction(() => this.sortDescending = !this.sortDescending);
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
            if (GlobalState.device) {
                if (this.initial && this.visible) {
                    this.initial = false;
                    this.loadFiles();
                }
            } else {
                this.initial = true;
            }
        });
    }

    pushPathQuery = (path: string) => {
        Router.push({ query: { ...Router.query, path } });
    };

    changeDirectory(path: string) {
        if (this.path === path) {
            return;
        }

        this.path = path;

        if (!GlobalState.device) {
            return;
        }

        this.loadFiles();
    }

    loadFiles = asyncEffect(async (signal) => {
        const currentPath = this.path;

        runInAction(() => this.items = []);

        if (!GlobalState.device) {
            return;
        }

        runInAction(() => this.loading = true);

        const sync = await GlobalState.device.sync();

        const items: ListItem[] = [];
        const linkItems: AdbSyncEntry[] = [];
        const intervalId = setInterval(() => {
            if (signal.aborted) {
                return;
            }

            runInAction(() => this.items = items.slice());
        }, 1000);

        try {
            for await (const entry of sync.opendir(currentPath)) {
                if (signal.aborted) {
                    return;
                }

                if (entry.name === '.' || entry.name === '..') {
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

                if (!await sync.isDirectory(path.resolve(currentPath, entry.name!))) {
                    entry.mode = (LinuxFileType.File << 12) | entry.permission;
                    entry.size = 0n;
                }

                items.push(toListItem(entry));
            }

            if (signal.aborted) {
                return;
            }

            runInAction(() => this.items = items);
        } finally {
            if (!signal.aborted) {
                runInAction(() => this.loading = false);
            }
            clearInterval(intervalId);
            sync.dispose();
        }
    });

    upload = async (file: File) => {
        const sync = await GlobalState.device!.sync();
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

            const intervalId = setInterval(action(() => {
                this.uploadSpeed = this.uploadedSize - this.debouncedUploadedSize;
                this.debouncedUploadedSize = this.uploadedSize;
            }), 1000);

            try {
                await createFileStream(file)
                    .pipeThrough(new ChunkStream(ADB_SYNC_MAX_PACKET_SIZE))
                    .pipeThrough(new ProgressStream(action((uploaded) => {
                        this.uploadedSize = uploaded;
                    })))
                    .pipeTo(sync.write(
                        itemPath,
                        (LinuxFileType.File << 12) | 0o666,
                        file.lastModified / 1000,
                    ));

                runInAction(() => {
                    this.uploadSpeed = this.uploadedSize - this.debouncedUploadedSize;
                    this.debouncedUploadedSize = this.uploadedSize;
                });
            } finally {
                clearInterval(intervalId);
            }
        } catch (e: any) {
            GlobalState.showErrorDialog(e);
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
                title: 'Uploading...',
                subText: state.uploadPath
            }}
        >
            <ProgressIndicator
                description={formatSpeed(state.debouncedUploadedSize, state.uploadTotalSize, state.uploadSpeed)}
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
        const sync = await GlobalState.device!.sync();
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

    const handleItemInvoked = useCallback((item: AdbSyncEntry) => {
        switch (item.type) {
            case LinuxFileType.Link:
            case LinuxFileType.Directory:
                state.pushPathQuery(path.resolve(state.path!, item.name!));
                break;
            case LinuxFileType.File:
                switch (path.extname(item.name!)) {
                    case '.jpg':
                    case '.png':
                    case '.svg':
                    case '.gif':
                        previewImage(path.resolve(state.path!, item.name!));
                        break;
                }
                break;
        }
    }, [previewImage]);

    const selection = useConst(() => new Selection({
        onSelectionChanged() {
            const selectedItems = selection.getSelection() as ListItem[];
            runInAction(() => {
                state.selectedItems = selectedItems;
            });
        },
    }));

    const showContextMenu = useCallback((
        item?: AdbSyncEntry,
        index?: number,
        e?: Event
    ) => {
        if (!e) {
            return false;
        }

        if (state.menuItems.length) {
            runInAction(() => {
                state.contextMenuTarget = e as MouseEvent;
            });
        }

        return false;
    }, []);
    const hideContextMenu = useCallback(() => {
        runInAction(() => state.contextMenuTarget = undefined);
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>File Manager - Android Web Toolbox</title>
            </Head>

            <CommandBar items={state.menuItems} />

            <Breadcrumb items={state.breadcrumbItems} />

            <StackItem grow styles={{
                root: {
                    margin: '-8px -16px -16px -16px',
                    padding: '8px 16px 16px 16px',
                    overflowY: 'auto',
                }
            }}>
                <MarqueeSelection selection={selection}>
                    <ShimmeredDetailsList
                        items={state.sortedList}
                        columns={state.columns}
                        setKey={state.path}
                        selection={selection}
                        layoutMode={DetailsListLayoutMode.justified}
                        enableShimmer={state.loading && state.items.length === 0}
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
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
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
                    contextualMenuItemAs={props => <ContextualMenuItem {...props} hasIcons={false} />}
                />
            </NoSsr>

            <UploadDialog />
        </Stack>
    );
};

export default observer(FileManager);
