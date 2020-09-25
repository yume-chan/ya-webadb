import { Breadcrumb, concatStyleSets, ContextualMenu, DetailsListLayoutMode, DirectionalHint, IBreadcrumbItem, IColumn, Icon, IContextualMenuItem, IDetailsHeaderProps, IDetailsList, IRenderFunction, Layer, MarqueeSelection, mergeStyleSets, Overlay, Selection, ShimmeredDetailsList, StackItem } from '@fluentui/react';
import { FileIconType, getFileTypeIconProps, initializeFileTypeIcons } from '@uifabric/file-type-icons';
import { useConst } from '@uifabric/react-hooks';
import { AdbSyncEntryResponse, LinuxFileType } from '@yume-chan/adb';
import { encodeUtf8 } from '@yume-chan/adb-backend-web';
import path from 'path';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import StreamSaver from 'streamsaver';
import { ErrorDialogContext } from '../error-dialog';
import withDisplayName from '../with-display-name';
import { RouteProps } from './type';

initializeFileTypeIcons();
StreamSaver.mitm = 'streamsaver/mitm.html';

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

const units = [' B', ' KB', ' MB', ' GB'];
function formatSize(value: number): string {
    let index = 0;
    while (index < units.length && value > 1024) {
        index += 1;
        value /= 1024;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + units[index];
}

function extensionName(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    if (index === -1) {
        return '';
    } else {
        return fileName.slice(index);
    }
}

const renderDetailsHeader: IRenderFunction<IDetailsHeaderProps> = (props?, defaultRender?) => {
    if (!props || !defaultRender) {
        return null;
    }

    return defaultRender({
        ...props,
        styles: concatStyleSets(props.styles, { root: { paddingTop: 0 } })
    });
};

function delay(time: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}

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

export default withDisplayName('FileManager', ({
    device,
}: RouteProps): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const [currentPath, setCurrentPath] = useState('/');
    const currentPathRef = useRef(currentPath);
    currentPathRef.current = currentPath;

    const breadcrumbItems = useMemo((): IBreadcrumbItem[] => {
        let part = '';
        const list: IBreadcrumbItem[] = currentPath.split('/').filter(Boolean).map(segment => {
            part += '/' + segment;
            return {
                key: part,
                text: segment,
                onClick: (e, item) => {
                    if (!item) {
                        return;
                    }
                    setCurrentPath(item.key);
                },
            };
        });
        list.unshift({
            key: '/',
            text: '/',
            onClick: () => setCurrentPath('/'),
        });
        list[list.length - 1].isCurrentItem = true;
        list[list.length - 1].onClick = undefined;
        return list;
    }, [currentPath]);

    const [items, setItems] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const listRef = useRef<IDetailsList | null>(null);
    const load = useCallback(async () => {
        setItems([]);

        if (!device) {
            setCurrentPath('/');
            return;
        }

        setLoading(true);
        const sync = await device.sync();

        const items: ListItem[] = [];
        const linkItems: AdbSyncEntryResponse[] = [];
        const intervalId = setInterval(() => {
            setItems(items.slice());
        }, 1000);

        try {
            let lastBreak = Date.now();

            for await (const entry of sync.opendir(currentPath)) {
                if (currentPath !== currentPathRef.current) {
                    break;
                }

                if (entry.name === '.' || entry.name === '..') {
                    continue;
                }

                if (entry.type === LinuxFileType.Link) {
                    linkItems.push(entry);
                } else {
                    items.push(toListItem(entry));
                }

                const now = Date.now();
                if (now - lastBreak > 16) {
                    await delay(0);
                    lastBreak = now;
                }
            }

            for (const entry of linkItems) {
                try {
                    const followLinkPath = path.resolve(currentPath, entry.name!) + '/';
                    await sync.lstat(followLinkPath);
                    items.push(toListItem(entry));
                } catch (e) {
                    items.push(toListItem(AdbSyncEntryResponse.create({
                        mode: (LinuxFileType.File << 12) | entry.permission,
                        size: 0,
                        mtime: entry.mtime,
                        name: entry.name,
                    }, { encodeUtf8 })));
                }
            }

            setItems(items);
            listRef.current?.scrollToIndex(0);
        } finally {
            if (currentPath === currentPathRef.current) {
                setLoading(false);
            }
            clearInterval(intervalId);
            sync.dispose();
        }
    }, [device, currentPath]);
    useEffect(() => {
        load();
    }, [load]);

    const [sortedList, setSortedList] = useState<ListItem[]>([]);
    const [sortKey, setSortKey] = useState<keyof ListItem>('name');
    const [sortDescending, setSortDescendent] = useState(false);
    useEffect(() => {
        const list = items.slice();
        list.sort((a, b) => {
            const aIsFile = a.type === LinuxFileType.File ? 1 : 0;
            const bIsFile = b.type === LinuxFileType.File ? 1 : 0;

            let result: number;
            if (aIsFile !== bIsFile) {
                result = aIsFile - bIsFile;
            } else {
                const aSortKey = a[sortKey]!;
                const bSortKey = b[sortKey]!;

                if (aSortKey === bSortKey) {
                    result = a.name! < b.name! ? -1 : 1;
                } else {
                    result = aSortKey < bSortKey ? -1 : 1;
                }
            }

            if (sortDescending) {
                result *= -1;
            }
            return result;
        });
        setSortedList(list);
    }, [items, sortKey, sortDescending]);

    const columns: IColumn[] = useMemo(() => {
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
                            return <Icon {...getFileTypeIconProps({ size: 20, extension: extensionName(item.name!) })} />;
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
                key: 'mode',
                name: 'Mode',
                minWidth: 0,
                onRender(item: AdbSyncEntryResponse) {
                    return `0${(item.mode >> 6 & 0b100).toString(8)}${(item.mode >> 3 & 0b100).toString(8)}${(item.mode & 0b100).toString(8)}`;
                }
            },
            {
                key: 'logicalSize',
                name: 'Size',
                minWidth: 0,
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
                onRender(item: AdbSyncEntryResponse) {
                    return new Date(item.mtime * 1000).toLocaleString();
                },
            }
        ];

        for (const item of list) {
            item.onColumnClick = (e, column) => {
                if (sortKey === column.key) {
                    setSortDescendent(!sortDescending);
                } else {
                    setSortKey(column.key as keyof ListItem);
                    setSortDescendent(false);
                }
            };

            if (item.key === sortKey) {
                item.isSorted = true;
                item.isSortedDescending = sortDescending;
            }
        }

        return list;
    }, [sortKey, sortDescending]);

    const [previewUrl, setPreviewUrl] = useState<string | undefined>();
    const previewImage = useCallback(async (path: string) => {
        const sync = await device!.sync();
        try {
            const readableStream = createReadableStreamFromBufferIterator(sync.receive(path));
            const response = new Response(readableStream);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setPreviewUrl(url);
        } finally {
            sync.dispose();
        }
    }, [device]);
    const hidePreview = useCallback(() => {
        setPreviewUrl(undefined);
    }, []);

    const handleItemInvoked = useCallback((item: AdbSyncEntryResponse) => {
        switch (item.type) {
            case LinuxFileType.Link:
            case LinuxFileType.Directory:
                setCurrentPath(path.resolve(currentPath, item.name!));
                break;
            case LinuxFileType.File:
                switch (extensionName(item.name!)) {
                    case '.jpg':
                    case '.png':
                    case '.svg':
                    case '.gif':
                        previewImage(path.resolve(currentPath, item.name!));
                        break;
                }
                break;
        }
    }, [currentPath, previewImage]);

    const selection = useConst(() => new Selection());

    const [contextMenuItems, setContextMenuItems] = useState<IContextualMenuItem[]>([]);
    const [contextMenuTarget, setContextMenuTarget] = useState<MouseEvent>();
    const showContextMenu = useCallback((
        item?: AdbSyncEntryResponse,
        index?: number,
        e?: Event
    ) => {
        if (!e) {
            return false;
        }

        const selectedItems = selection.getSelection() as ListItem[];

        let contextMenuItems: IContextualMenuItem[] = [];

        if (selectedItems.length === 1 &&
            selectedItems[0].type === LinuxFileType.File) {
            contextMenuItems.push({
                key: 'download',
                text: 'Download',
                onClick() {
                    (async () => {
                        const sync = await device!.sync();
                        try {
                            const itemPath = path.resolve(currentPath, selectedItems[0].name!);
                            const readableStream = createReadableStreamFromBufferIterator(sync.receive(itemPath));

                            const writeableStream = StreamSaver.createWriteStream(selectedItems[0].name!, {
                                size: selectedItems[0].size,
                            });
                            await readableStream.pipeTo(writeableStream);
                        } catch (e) {
                            showErrorDialog(e.message);
                        } finally {
                            sync.dispose();
                        }
                    })();
                    return false;
                },
            });
        }

        contextMenuItems.push({
            key: 'delete',
            text: 'Delete',
            onClick() {
                (async () => {
                    try {
                        for (const item of selectedItems) {
                            const output = await device!.shell('rm', '-rf', `"${path.resolve(currentPath, item.name!)}"`);
                            if (output) {
                                showErrorDialog(output);
                                return;
                            }
                        }
                    } catch (e) {
                        showErrorDialog(e.message);
                    } finally {
                        load();
                    }
                })();
                return false;
            }
        });

        if (!contextMenuItems.length) {
            return false;
        }

        setContextMenuItems(contextMenuItems);
        setContextMenuTarget(e as MouseEvent);
        return false;
    }, [currentPath, device]);
    const hideContextMenu = React.useCallback(() => {
        setContextMenuTarget(undefined);
    }, []);

    return (
        <MarqueeSelection selection={selection}>
            {device && (
                <StackItem>
                    <Breadcrumb items={breadcrumbItems} />
                </StackItem>
            )}

            <StackItem
                grow
                styles={{ root: { minHeight: 0 } }}
            >
                <ShimmeredDetailsList
                    componentRef={listRef}
                    items={sortedList}
                    columns={columns}
                    setKey={currentPath}
                    selection={selection}
                    layoutMode={DetailsListLayoutMode.justified}
                    enableShimmer={loading && items.length === 0}
                    onItemInvoked={handleItemInvoked}
                    onItemContextMenu={showContextMenu}
                    onRenderDetailsHeader={renderDetailsHeader}
                    usePageCache
                />
            </StackItem>

            {previewUrl && (
                <Layer>
                    <Overlay onClick={hidePreview}>
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={previewUrl} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        </div>
                    </Overlay>
                </Layer>
            )}

            <ContextualMenu
                items={contextMenuItems}
                hidden={!contextMenuTarget}
                directionalHint={DirectionalHint.bottomLeftEdge}
                target={contextMenuTarget}
                onDismiss={hideContextMenu}
            />
        </MarqueeSelection>
    );
});
