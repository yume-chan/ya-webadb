import { Breadcrumb, concatStyleSets, ContextualMenu, ContextualMenuItem, DetailsListLayoutMode, Dialog, DirectionalHint, IBreadcrumbItem, IColumn, Icon, IContextualMenuItem, IDetailsHeaderProps, IDetailsList, IRenderFunction, Layer, MarqueeSelection, mergeStyleSets, Overlay, ProgressIndicator, ScrollToMode, Selection, ShimmeredDetailsList, Stack, StackItem } from '@fluentui/react';
import { FileIconType, getFileTypeIconProps, initializeFileTypeIcons } from '@fluentui/react-file-type-icons';
import { useConst } from '@fluentui/react-hooks';
import { AdbSyncEntryResponse, AdbSyncMaxPacketSize, LinuxFileType } from '@yume-chan/adb';
import { autorun, makeAutoObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import Router, { useRouter } from "next/router";
import path from 'path';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CommandBar } from '../components';
import { global } from '../state';
import { asyncEffect, chunkFile, formatSize, formatSpeed, pickFile, RouteStackProps, useSpeed } from '../utils';

let StreamSaver: typeof import('streamsaver');
if (typeof window !== 'undefined') {
    StreamSaver = require('streamsaver');
    StreamSaver.mitm = 'streamsaver/mitm.html';
}

initializeFileTypeIcons();

interface ListItem extends AdbSyncEntryResponse {
    key: string;
}

function toListItem(item: AdbSyncEntryResponse): ListItem {
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

function createReadableStreamFromBufferIterator(
    iterator: AsyncIterator<ArrayBuffer>
): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
        async pull(controller) {
            const { desiredSize } = controller;
            if (!desiredSize || desiredSize < 0) {
                return;
            }

            let written = 0;
            while (written < desiredSize) {
                const result = await iterator.next();
                if (result.done) {
                    controller.close();
                    return;
                }

                controller.enqueue(new Uint8Array(result.value));
                written += result.value.byteLength;
            }
        },
    });
}

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
    startItemIndexInView = 0;

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
        const list: IColumn[] = [
            {
                key: 'type',
                name: 'File Type',
                iconName: 'Page',
                isIconOnly: true,
                minWidth: 20,
                maxWidth: 20,
                isCollapsible: true,
                onRender(item: AdbSyncEntryResponse) {
                    switch (item.type) {
                        case LinuxFileType.Link:
                            return <Icon {...getFileTypeIconProps({ size: 20, type: FileIconType.linkedFolder })} />;
                        case LinuxFileType.Directory:
                            return <Icon {...getFileTypeIconProps({ size: 20, type: FileIconType.folder })} />;
                        case LinuxFileType.File:
                            return <Icon {...getFileTypeIconProps({ size: 20, extension: path.extname(item.name!) })} />;
                        default:
                            return <Icon {...getFileTypeIconProps({ size: 20, extension: 'txt' })} />;
                    }
                }
            },
            {
                key: 'name',
                name: 'Name',
                minWidth: 0,
                isRowHeader: true,
                onRender(item: AdbSyncEntryResponse) {
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
                onRender(item: AdbSyncEntryResponse) {
                    return `${(item.mode >> 6 & 0b100).toString(8)}${(item.mode >> 3 & 0b100).toString(8)}${(item.mode & 0b100).toString(8)}`;
                }
            },
            {
                key: 'size',
                name: 'Size',
                minWidth: 0,
                isCollapsible: true,
                onRender(item: AdbSyncEntryResponse) {
                    if (item.type === LinuxFileType.File) {
                        return formatSize(item.size);
                    }
                    return '';
                }
            },
            {
                key: 'mtime',
                name: 'Last Modified Time',
                minWidth: 150,
                isCollapsible: true,
                onRender(item: AdbSyncEntryResponse) {
                    return new Date(item.mtime * 1000).toLocaleString();
                },
            }
        ];

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
            changeDirectory: false,
            loadFiles: false,
        });

        autorun(() => {
            if (global.device) {
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

        if (!global.device) {
            return;
        }

        this.loadFiles();
    }

    loadFiles = asyncEffect(async (signal) => {
        const currentPath = this.path;

        runInAction(() => this.items = []);

        if (!global.device) {
            return;
        }

        runInAction(() => this.loading = true);

        const sync = await global.device.sync();

        const items: ListItem[] = [];
        const linkItems: AdbSyncEntryResponse[] = [];
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
                    entry.size = 0;
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
}

const state = new FileManagerState();

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

    const listRef = useRef<IDetailsList | null>(null);
    useLayoutEffect(() => {
        const list = listRef.current;
        return () => {
            state.startItemIndexInView = list?.getStartItemIndexInView() ?? 0;
        };
    }, []);
    const scrolledRef = useRef(false);
    const handleListUpdate = useCallback((list?: IDetailsList) => {
        if (!scrolledRef.current) {
            list?.scrollToIndex(state.startItemIndexInView, undefined, ScrollToMode.top);
            scrolledRef.current = true;
        }
    }, []);

    const [previewUrl, setPreviewUrl] = useState<string | undefined>();
    const previewImage = useCallback(async (path: string) => {
        const sync = await global.device!.sync();
        try {
            const readableStream = createReadableStreamFromBufferIterator(sync.read(path));
            const response = new Response(readableStream);
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

    const handleItemInvoked = useCallback((item: AdbSyncEntryResponse) => {
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

    const [selectedItems, setSelectedItems] = useState<ListItem[]>([]);
    const selection = useConst(() => new Selection({
        onSelectionChanged() {
            const selectedItems = selection.getSelection() as ListItem[];
            setSelectedItems(selectedItems);
        },
    }));

    const [uploading, setUploading] = useState(false);
    const [uploadPath, setUploadPath] = useState('');
    const [uploadedSize, setUploadedSize] = useState(0);
    const [uploadTotalSize, setUploadTotalSize] = useState(0);
    const [debouncedUploadedSize, uploadSpeed] = useSpeed(uploadedSize, uploadTotalSize);
    const upload = useCallback(async (file: File) => {
        const sync = await global.device!.sync();
        try {
            const itemPath = path.resolve(state.path!, file.name);
            setUploading(true);
            setUploadPath(file.name);
            setUploadTotalSize(file.size);
            await sync.write(
                itemPath,
                chunkFile(file, AdbSyncMaxPacketSize),
                (LinuxFileType.File << 12) | 0o666,
                file.lastModified / 1000,
                setUploadedSize,
            );
        } catch (e) {
            global.showErrorDialog(e instanceof Error ? e.message : `${e}`);
        } finally {
            sync.dispose();
            state.loadFiles();
            setUploading(false);
        }
    }, []);

    const [menuItems, setMenuItems] = useState<IContextualMenuItem[]>([]);
    useEffect(() => {
        let result: IContextualMenuItem[] = [];

        switch (selectedItems.length) {
            case 0:
                result.push({
                    key: 'upload',
                    text: 'Upload',
                    iconProps: { iconName: 'Upload' },
                    disabled: !global.device,
                    onClick() {
                        (async () => {
                            const files = await pickFile({ multiple: true });
                            for (let i = 0; i < files.length; i++) {
                                const file = files.item(i)!;
                                await upload(file);
                            }
                        })();

                        return false;
                    }
                });
                break;
            case 1:
                if (selectedItems[0].type === LinuxFileType.File) {
                    result.push({
                        key: 'download',
                        text: 'Download',
                        iconProps: { iconName: 'Download' },
                        onClick() {
                            (async () => {
                                const sync = await global.device!.sync();
                                try {
                                    const itemPath = path.resolve(state.path, selectedItems[0].name!);
                                    const readableStream = createReadableStreamFromBufferIterator(sync.read(itemPath));

                                    const writeableStream = StreamSaver!.createWriteStream(selectedItems[0].name!, {
                                        size: selectedItems[0].size,
                                    });
                                    await readableStream.pipeTo(writeableStream);
                                } catch (e) {
                                    global.showErrorDialog(e instanceof Error ? e.message : `${e}`);
                                } finally {
                                    sync.dispose();
                                }
                            })();
                            return false;
                        },
                    });
                }
            default:
                result.push({
                    key: 'delete',
                    text: 'Delete',
                    iconProps: { iconName: 'Delete' },
                    onClick() {
                        (async () => {
                            try {
                                for (const item of selectedItems) {
                                    const output = await global.device!.rm(path.resolve(state.path, item.name!));
                                    if (output) {
                                        global.showErrorDialog(output);
                                        return;
                                    }
                                }
                            } catch (e) {
                                global.showErrorDialog(e instanceof Error ? e.message : `${e}`);
                            } finally {
                                state.loadFiles();
                            }
                        })();
                        return false;
                    }
                });
                break;
        }

        setMenuItems(result);
    }, [selectedItems, upload]);

    const [contextMenuTarget, setContextMenuTarget] = useState<MouseEvent>();
    const showContextMenu = useCallback((
        _item?: AdbSyncEntryResponse,
        _index?: number,
        e?: Event
    ) => {
        if (!e) {
            return false;
        }

        if (menuItems.length) {
            setContextMenuTarget(e as MouseEvent);
        }

        return false;
    }, [menuItems]);
    const hideContextMenu = useCallback(() => {
        setContextMenuTarget(undefined);
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>File Manager - WebADB</title>
            </Head>

            <CommandBar items={menuItems} />

            <StackItem grow styles={{
                root: {
                    margin: '-8px -16px -16px -16px',
                    padding: '8px 16px 16px 16px',
                    minHeight: 0,
                }
            }}>
                <MarqueeSelection selection={selection}>
                    <Breadcrumb items={state.breadcrumbItems} />

                    <ShimmeredDetailsList
                        componentRef={listRef}
                        items={state.sortedList}
                        columns={state.columns}
                        setKey={state.path}
                        selection={selection}
                        layoutMode={DetailsListLayoutMode.justified}
                        enableShimmer={state.loading && state.items.length === 0}
                        onItemInvoked={handleItemInvoked}
                        onItemContextMenu={showContextMenu}
                        onRenderDetailsHeader={renderDetailsHeader}
                        onDidUpdate={handleListUpdate}
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

                <ContextualMenu
                    items={menuItems}
                    hidden={!contextMenuTarget}
                    directionalHint={DirectionalHint.bottomLeftEdge}
                    target={contextMenuTarget}
                    onDismiss={hideContextMenu}
                    contextualMenuItemAs={props => <ContextualMenuItem {...props} hasIcons={false} />}
                />

                <Dialog
                    hidden={!uploading}
                    dialogContentProps={{
                        title: 'Uploading...',
                        subText: uploadPath
                    }}
                >
                    <ProgressIndicator
                        description={formatSpeed(debouncedUploadedSize, uploadTotalSize, uploadSpeed)}
                        percentComplete={uploadedSize / uploadTotalSize}
                    />
                </Dialog>
            </StackItem>
        </Stack>
    );
};

export default observer(FileManager);
