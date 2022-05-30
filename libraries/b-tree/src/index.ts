interface BTreeInsertionResult {
    key: number;
    child: BTreeNode;
}

function insert(array: Int32Array, length: number, value: number, index: number) {
    if (index !== length) {
        array.set(array.subarray(index, length), index + 1);
    }
    array[index] = value;
}

export class BTreeNode {
    order: number;
    mid: number;

    keys: Int32Array;
    keyCount: number;

    height: number;
    children: BTreeNode[];

    public constructor(
        order: number,
        keys: Int32Array,
        keyCount: number,
        height: number,
        children: BTreeNode[]
    ) {
        this.order = order;
        this.mid = this.order >> 1;

        this.keys = keys;
        this.keyCount = keyCount;

        this.height = height;
        this.children = children;
    }

    protected split(value: number, index: number, child?: BTreeNode): BTreeInsertionResult {
        let parentKey: number;
        const sibilingKeys = new Int32Array(this.order - 1);
        let sibilingChildren: BTreeNode[];

        if (index < this.mid) {
            parentKey = this.keys[this.mid - 1]!;
            sibilingKeys.set(this.keys.subarray(this.mid), 0);

            insert(this.keys, this.mid - 1, value, index);

            if (child) {
                // internal node
                sibilingChildren = this.children.splice(this.mid, this.order - this.mid);
                // TODO: this may cause the underlying array to grow (re-alloc and copy)
                // investigate if this is a problem.
                this.children.splice(index + 1, 0, child);
            } else {
                // leaf node
                sibilingChildren = new Array(this.order);
            }
        } else {
            if (index === this.mid) {
                parentKey = value;
                sibilingKeys.set(this.keys.subarray(this.mid), 0);
            } else {
                parentKey = this.keys[this.mid]!;
                if (index !== this.mid + 1) {
                    sibilingKeys.set(this.keys.subarray(this.mid + 1, index), 0);
                }
                sibilingKeys[index - this.mid - 1] = value;
                sibilingKeys.set(this.keys.subarray(index), index - this.mid);
            }

            if (child) {
                sibilingChildren = this.children.splice(this.mid + 1, this.order - this.mid - 1);
                sibilingChildren.splice(index - this.mid, 0, child);
            } else {
                sibilingChildren = new Array(this.order);
            }
        }

        this.keyCount = this.mid;
        return {
            key: parentKey,
            child: new BTreeNode(
                this.order,
                sibilingKeys,
                this.order - 1 - this.mid,
                this.height,
                sibilingChildren
            ),
        };
    }

    public search(value: number): number {
        let start = 0;
        let end = this.keyCount - 1;
        while (start <= end) {
            const mid = (start + end) >> 1;
            if (this.keys[mid] === value) {
                return mid;
            } else if (this.keys[mid]! < value) {
                start = mid + 1;
            } else {
                end = mid - 1;
            }
        }
        return ~start;
    }

    public insert(value: number): BTreeInsertionResult | undefined {
        let index = this.search(value);
        if (index >= 0) {
            return;
        }

        index = ~index;

        if (this.height === 0) {
            if (this.keyCount === this.order - 1) {
                return this.split(value, index);
            }

            insert(this.keys, this.keyCount, value, index);
            this.keyCount += 1;
            return;
        }

        const child = this.children[index]!;
        const split = child.insert(value);
        if (split) {
            if (this.keyCount === this.order - 1) {
                return this.split(split.key, index, split.child);
            }

            insert(this.keys, this.keyCount, split.key, index);
            this.keyCount += 1;

            this.children.splice(index + 1, 0, split.child);
        }
        return;
    }

    log(): any[] {
        const result = [];
        for (let i = 0; i < this.keyCount; i += 1) {
            result.push(this.children[i]?.log());
            result.push(this.keys[i]);
        }
        result.push(this.children[this.keyCount]?.log());
        return result;
    }
}

export class BTreeRoot extends BTreeNode {
    public constructor(order: number) {
        super(
            order,
            new Int32Array(order - 1),
            0,
            0,
            new Array(order)
        );
    }

    protected override split(value: number, index: number, child?: BTreeNode): BTreeInsertionResult {
        const split = super.split(value, index, child);

        this.children[0] = new BTreeNode(
            this.order,
            this.keys,
            this.keyCount,
            this.height,
            this.children.slice(),
        );

        this.children[1] = split.child;

        this.keys = new Int32Array(this.order);
        this.keys[0] = split.key;
        this.keyCount = 1;
        this.height += 1;

        return split;
    }
}

export class BTree {
    order: number;
    root: BTreeNode;

    public constructor(order: number) {
        this.order = order;
        this.root = new BTreeRoot(order);
    }

    public has(value: number) {
        let node = this.root;
        while (true) {
            const index = node.search(value);
            if (index >= 0) {
                return true;
            }

            node = node.children[~index]!;
            if (!node) {
                return false;
            }
        }
    }

    public insert(value: number) {
        this.root.insert(value);
    }
}
