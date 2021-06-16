import { Breadcrumb, concatStyleSets, ContextualMenu, ContextualMenuItem, DetailsListLayoutMode, Dialog, DirectionalHint, IBreadcrumbItem, IColumn, Icon, IContextualMenuItem, IDetailsHeaderProps, IDetailsList, IRenderFunction, Layer, MarqueeSelection, mergeStyleSets, Overlay, ProgressIndicator, Selection, ShimmeredDetailsList, StackItem } from '@fluentui/react';
import { FileIconType, getFileTypeIconProps, initializeFileTypeIcons } from '@fluentui/react-file-type-icons';
import { useConst } from '@fluentui/react-hooks';
import { AdbSyncEntryResponse, AdbSyncMaxPacketSize, LinuxFileType } from '@yume-chan/adb';
import path from 'path';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import StreamSaver from 'streamsaver';
import { CommandBar, ErrorDialogContext } from '../components';
import { delay, formatSize, formatSpeed, pickFile, useSpeed, withDisplayName } from '../utils';
import { useAdbDevice } from './type';

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

export async function* chunkFile(file: File): AsyncGenerator<ArrayBuffer, void, void> {
    for (let i = 0; i < file.size; i += AdbSyncMaxPacketSize) {
        yield file.slice(i, i + AdbSyncMaxPacketSize, file.type).arrayBuffer();
    }
}

function compareCaseInsensitively(a: string, b: string) {
    let result = a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
    if (result !== 0) {
        return result;
    } else {
        return a.localeCompare(b);
    }
}

export const FileManager = withDisplayName('FileManager')((): JSX.Element | null => {
    const { show: showErrorDialog } = useContext(ErrorDialogContext);

    const device = useAdbDevice();
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
                onClick: (_e, item) => {
                    if (!item) {
                        return;
                    }
                    setCurrentPath(item.key);
                },
            };
        });
        list.unshift({
            key: '/',
            text: 'Device',
            onClick: () => setCurrentPath('/'),
        });
        list[list.length - 1].isCurrentItem = true;
        delete list[list.length - 1].onClick;
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
                if (!await sync.isDirectory(path.resolve(currentPath, entry.name!))) {
                    entry.mode = (LinuxFileType.File << 12) | entry.permission;
                    entry.size = 0;
                    toListItem(entry);
                }
                items.push(toListItem(entry));
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
                    result = compareCaseInsensitively(a.name!, b.name!);
                } else if (typeof aSortKey === 'string') {
                    result = compareCaseInsensitively(aSortKey, bSortKey as string);
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
            item.onColumnClick = (_e, column) => {
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
            const readableStream = createReadableStreamFromBufferIterator(sync.read(path));
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
                switch (path.extname(item.name!)) {
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
        const sync = await device!.sync();
        try {
            const itemPath = path.resolve(currentPath, file.name);
            setUploading(true);
            setUploadPath(file.name);
            setUploadTotalSize(file.size);
            await sync.write(
                itemPath,
                chunkFile(file),
                (LinuxFileType.File << 12) | 0o666,
                file.lastModified / 1000,
                setUploadedSize,
            );
        } catch (e) {
            showErrorDialog(e instanceof Error ? e.message : `${e}`);
        } finally {
            sync.dispose();
            load();
            setUploading(false);
        }
    }, [currentPath, device]);

    const [menuItems, setMenuItems] = useState<IContextualMenuItem[]>([]);
    useEffect(() => {
        let result: IContextualMenuItem[] = [];

        switch (selectedItems.length) {
            case 0:
                result.push({
                    key: 'upload',
                    text: 'Upload',
                    iconProps: { iconName: 'Upload' },
                    disabled: !device,
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
            // @ts-expect-error
            case 1:
                if (selectedItems[0].type === LinuxFileType.File) {
                    result.push({
                        key: 'download',
                        text: 'Download',
                        iconProps: { iconName: 'Download' },
                        onClick() {
                            (async () => {
                                const sync = await device!.sync();
                                try {
                                    const itemPath = path.resolve(currentPath, selectedItems[0].name!);
                                    const readableStream = createReadableStreamFromBufferIterator(sync.read(itemPath));

                                    const writeableStream = StreamSaver.createWriteStream(selectedItems[0].name!, {
                                        size: selectedItems[0].size,
                                    });
                                    await readableStream.pipeTo(writeableStream);
                                } catch (e) {
                                    showErrorDialog(e instanceof Error ? e.message : `${e}`);
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
                                    const output = await device!.rm(path.resolve(currentPath, item.name!));
                                    if (output) {
                                        showErrorDialog(output);
                                        return;
                                    }
                                }
                            } catch (e) {
                                showErrorDialog(e instanceof Error ? e.message : `${e}`);
                            } finally {
                                load();
                            }
                        })();
                        return false;
                    }
                });
                break;
        }

        setMenuItems(result);
    }, [selectedItems, device, currentPath]);

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
    }, [device, menuItems]);
    const hideContextMenu = useCallback(() => {
        setContextMenuTarget(undefined);
    }, []);

    return (
        <>
            <CommandBar items={menuItems} />

            <StackItem grow styles={{
                root: {
                    margin: '-8px -16px -16px -16px',
                    padding: '8px 16px 16px 16px',
                    minHeight: 0,
                }
            }}>
                <MarqueeSelection selection={selection}>
                    <Breadcrumb items={breadcrumbItems} />

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
                </MarqueeSelection>

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
        </>
    );
});
