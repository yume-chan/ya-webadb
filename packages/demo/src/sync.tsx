import { Breadcrumb, concatStyleSets, ContextualMenu, DetailsListLayoutMode, DirectionalHint, IBreadcrumbItem, IColumn, Icon, IContextualMenuItem, IDetailsHeaderProps, IRenderFunction, Layer, Link, Overlay, ShimmeredDetailsList, Stack, StackItem } from '@fluentui/react';
import { FileIconType, getFileTypeIconProps, initializeFileTypeIcons } from '@uifabric/file-type-icons';
import { useConstCallback } from '@uifabric/react-hooks';
import { Adb, AdbSyncEntryResponse, LinuxFileType } from '@yume-chan/adb';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StreamSaver from 'streamsaver';
import withDisplayName from './with-display-name';

initializeFileTypeIcons();
StreamSaver.mitm = 'streamsaver/mitm.html';

export interface SyncProps {
    device: Adb | undefined;

    visible: boolean;
}

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

function combinePath(...segments: string[]): string {
    return segments.reduce((result, item) => {
        if (result.endsWith('/')) {
            return `${result}${item}`;
        } else {
            return `${result}/${item}`;
        }
    }, '');
}

function createReadableStreamFromBufferIterator(iterator: AsyncIterator<ArrayBuffer>): ReadableStream {
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

export default withDisplayName('Sync', ({
    device,
    visible,
}: SyncProps): JSX.Element | null => {
    const [cached, setCached] = useState(false);
    useEffect(() => {
        if (visible) {
            setCached(true);
        }
    }, [visible]);

    const [path, setPath] = useState('/');
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<AdbSyncEntryResponse[]>([]);
    useEffect(() => {
        (async () => {
            if (!cached) {
                return;
            }

            if (!device) {
                setPath('/');
                setItems([]);
                return;
            }

            setLoading(true);
            const sync = await device.sync();
            try {
                let list = await sync.list(path);
                list = list.filter(item => item.name !== '.' && item.name !== '..');
                list.sort((a, b) => {
                    if (a.type === LinuxFileType.Directory) {
                        if (b.type === LinuxFileType.Directory) {
                            return a.name < b.name ? -1 : 1;
                        }
                        return -1;
                    }
                    if (b.type === LinuxFileType.Directory) {
                        return 1;
                    }
                    return a.name < b.name ? -1 : 1;
                });
                setItems(list);
            } finally {
                setLoading(false);
                sync.dispose();
            }
        })();
    }, [cached, device, path]);

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
                setPath(combinePath(path, item.name));
                break;
            case LinuxFileType.File:
                switch (extensionName(item.name)) {
                    case '.jpg':
                    case '.png':
                    case '.svg':
                    case '.gif':
                        previewImage(combinePath(path, item.name));
                        break;
                }
                break;
        }
    }, [path, previewImage]);

    const columns = useMemo((): IColumn[] => [
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
                        return <Icon {...getFileTypeIconProps({ size: 20, extension: extensionName(item.name) })} />;
                    default:
                        return <Icon {...getFileTypeIconProps({ size: 20, extension: 'txt' })} />;
                }
            }
        },
        {
            key: 'name',
            name: 'Name',
            fieldName: 'name',
            minWidth: 0,
            isRowHeader: true,
            isSorted: true,
            onRender(item: AdbSyncEntryResponse) {
                return (
                    <Link onClick={() => handleItemInvoked(item)} styles={{
                        root: {
                            color: 'inherit',
                            '&:active, &:hover, &:active:hover, &:focus': {
                                color: 'inherit',
                            }
                        }
                    }} >
                        {item.name}
                    </Link>
                );
            }
        },
        {
            key: 'mode',
            name: 'Mode',
            fieldName: 'mode',
            minWidth: 0,
            onRender(item: AdbSyncEntryResponse) {
                return `0${(item.mode >> 6 & 0b100).toString(8)}${(item.mode >> 3 & 0b100).toString(8)}${(item.mode & 0b100).toString(8)}`;
            }
        },
        {
            key: 'size',
            name: 'Size',
            fieldName: 'size',
            minWidth: 0,
            onRender(item: AdbSyncEntryResponse) {
                if (item.type === LinuxFileType.File) {
                    return formatSize(item.size);
                }
                return '';
            }
        },
        {
            key: 'lastModifiedTime',
            name: 'Last Modified Time',
            fieldName: 'lastModifiedTime',
            minWidth: 150,
            onRender(item: AdbSyncEntryResponse) {
                return new Date(item.lastModifiedTime * 1000).toLocaleString();
            },
        },
    ], [handleItemInvoked]);

    const getKey = useCallback((item: AdbSyncEntryResponse, index?: number) => {
        return item?.name ?? index?.toString() ?? '';
    }, []);

    const breadcrumb = useMemo((): IBreadcrumbItem[] => {
        let part = '';
        const list: IBreadcrumbItem[] = path.split('/').filter(Boolean).map(segment => {
            part += '/' + segment;
            return {
                key: part,
                text: segment,
                onClick: (e, item) => {
                    if (!item) {
                        return;
                    }
                    setPath(item.key);
                },
            };
        });
        list.unshift({
            key: '/',
            text: '/',
            onClick: () => setPath('/'),
        });
        list[list.length - 1].isCurrentItem = true;
        list[list.length - 1].onClick = undefined;
        return list;
    }, [path]);

    const [contextMenuItems, setContextMenuItems] = useState<IContextualMenuItem[]>([]);
    const [contextMenuTarget, setContextMenuTarget] = useState<MouseEvent>();
    const showContextMenu = useCallback((
        item?: AdbSyncEntryResponse,
        index?: number,
        e?: Event
    ) => {
        if (!item) {
            return false;
        }

        let contextMenuItems: IContextualMenuItem[] = [];

        if (item.type === LinuxFileType.File) {
            contextMenuItems.push({
                key: 'download',
                text: 'Download',
                onClick() {
                    (async () => {
                        const sync = await device!.sync();
                        try {
                            const itemPath = combinePath(path, item.name);
                            const readableStream = createReadableStreamFromBufferIterator(sync.receive(itemPath));

                            const writeableStream = StreamSaver.createWriteStream(item.name, {
                                size: item.size,
                            });
                            await readableStream.pipeTo(writeableStream);
                        } finally {
                            sync.dispose();
                        }
                    })();
                    return false;
                },
            });
        }

        if (!contextMenuItems.length) {
            return false;
        }

        setContextMenuItems(contextMenuItems);
        setContextMenuTarget(e as MouseEvent);
        return false;
    }, [path, device]);
    const hideContextMenu = useConstCallback(() => {
        setContextMenuTarget(undefined);
    });

    if (!cached) {
        return null;
    }

    return (
        <Stack
            verticalFill
            styles={{ root: { overflow: 'auto' } }}
            tokens={{ childrenGap: 8, padding: 8 }}
        >
            {device && (
                <StackItem >
                    <Breadcrumb items={breadcrumb} />
                </StackItem>
            )}
            <StackItem grow styles={{ root: { minHeight: 0 } }}>
                <ShimmeredDetailsList
                    items={items}
                    columns={columns}
                    getKey={getKey}
                    setKey={path}
                    layoutMode={DetailsListLayoutMode.justified}
                    enableShimmer={loading}
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
        </Stack>
    );
});
