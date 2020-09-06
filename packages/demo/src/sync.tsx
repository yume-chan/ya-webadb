import { Breadcrumb, concatStyleSets, DetailsHeader, DetailsListLayoutMode, IBreadcrumbItem, IColumn, Icon, IDetailsHeaderProps, ShimmeredDetailsList, Stack, StackItem } from '@fluentui/react';
import { FileIconType, getFileTypeIconProps, initializeFileTypeIcons } from '@uifabric/file-type-icons';
import { Adb, AdbSyncEntryResponse, LinuxFileType } from '@yume-chan/adb';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import withDisplayName from './with-display-name';

initializeFileTypeIcons();

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

const ListColumns: IColumn[] = [
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
];

function renderDetailsHeader(props?: IDetailsHeaderProps) {
    if (!props) {
        return null;
    }

    return (
        <DetailsHeader
            {...props}
            styles={concatStyleSets(props.styles, { root: { paddingTop: 0 } })}
        />
    );
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

    const gotoFolder = useCallback((item: AdbSyncEntryResponse) => {
        if (path === '/') {
            setPath('/' + item.name);
        } else {
            setPath(path + '/' + item.name);
        }
    }, [path]);

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

    if (!cached) {
        return null;
    }

    return (
        <Stack
            verticalFill
            styles={{ root: { overflow: 'auto' } }}
            tokens={{ childrenGap: 8, padding: 8 }}
        >
            <StackItem >
                <Breadcrumb items={breadcrumb} />
            </StackItem>
            <StackItem grow styles={{ root: { minHeight: 0 } }}>
                <ShimmeredDetailsList
                    items={items}
                    columns={ListColumns}
                    getKey={getKey}
                    setKey={path}
                    layoutMode={DetailsListLayoutMode.justified}
                    enableShimmer={loading}
                    onItemInvoked={gotoFolder}
                    onRenderDetailsHeader={renderDetailsHeader}
                    usePageCache
                />
            </StackItem>
        </Stack>
    );
});
