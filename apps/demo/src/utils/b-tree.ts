export function binarySearch(
    array: Uint8Array,
    start: number,
    end: number,
    value: number,
) {
    while (start <= end) {
        const mid = (start + end) >> 1;
        if (array[mid] === value) {
            return mid;
        } else if (array[mid] < value) {
            start = mid + 1;
        } else {
            end = mid - 1;
        }
    }
    return -(start + 1);
}

interface BTreeInsertionResult {
    keys: Uint8Array;
    keyCount: number;
    children: BTreeNode[];
}

export class BTreeNode {
    order: number;

    keys: Uint8Array;
    keyCount: number;

    children: BTreeNode[];

    isLeaf = true;

    public constructor(
        order: number,
        keys: Uint8Array,
        keyCount: number,
        children: BTreeNode[]
    ) {
        this.order = order;
        this.keys = keys;
        this.keyCount = keyCount;
        this.children = children;
    }

    protected split(value: number, index: number, split?: BTreeInsertionResult): BTreeInsertionResult {
        const keys = new Uint8Array(this.order);
        let children: BTreeNode[];
        const mid = this.keyCount >> 1;

        if (index < mid) {
            keys.set(this.keys.subarray(mid - 1), 0);

            this.keys.set(this.keys.subarray(index, mid - 1), index + 1);
            this.keys[index] = value;

            if (split) {
                children = this.children.splice(mid - 1, this.order - mid + 1);
                // TODO: this may cause the underlying array to grow (re-alloc and copy)
                // investigate if this is a problem.
                this.children.splice(
                    index,
                    0,
                    new BTreeNode(
                        this.order,
                        split.keys,
                        split.keyCount,
                        split.children
                    ),
                );
            } else {
                children = new Array(this.order);
            }
        } else {
            if (index !== mid) {
                keys.set(this.keys.subarray(mid, index), 0);
            }
            keys[index - mid] = value;
            keys.set(this.keys.subarray(index), index - mid + 1);

            if (split) {
                children = this.children.splice(mid, this.order - mid);
                children.splice(
                    index - mid,
                    0,
                    new BTreeNode(
                        this.order,
                        split.keys.subarray(1),
                        split.keyCount,
                        split.children
                    ),
                );
            } else {
                children = new Array(this.order);
            }
        }

        this.keyCount = mid;
        return {
            keys,
            keyCount: this.order - 1 - mid,
            children
        };
    }

    public insert(value: number): BTreeInsertionResult | undefined {
        let index = binarySearch(this.keys, 0, this.keyCount - 1, value);
        if (index >= 0) {
            return;
        }

        index = -index - 1;

        if (!this.isLeaf) {
            let child = this.children[index];

            if (!child) {
                child = new BTreeNode(
                    this.order,
                    new Uint8Array(this.order - 1),
                    0,
                    new Array(this.order)
                );
                child.keys[0] = value;
                child.keyCount = 1;
                this.children[index] = child;
                return;
            }

            const split = child.insert(value);
            if (split) {
                if (this.keyCount === this.order - 1) {
                    value = split.keys[0];
                    split.keys = split.keys.subarray(1);
                    return this.split(value, index, split);
                } else {
                    this.keys.set(this.keys.subarray(index, this.keyCount), index + 1);
                    this.keys[index] = split.keys[0];
                    this.keyCount += 1;

                    this.children.splice(
                        index,
                        0,
                        new BTreeNode(
                            this.order,
                            split.keys.subarray(1),
                            split.keyCount,
                            split.children
                        ),
                    );
                }
            }

            return;
        }

        if (this.keyCount === this.order - 1) {
            return this.split(value, index);
        }

        if (index !== this.keyCount) {
            this.keys.set(this.keys.subarray(index, this.keyCount), index + 1);
        }
        this.keys[index] = value;
        this.keyCount += 1;
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
            new Uint8Array(order - 1),
            0,
            new Array(order)
        );
    }

    protected override split(value: number, index: number, split?: BTreeInsertionResult | undefined): BTreeInsertionResult {
        split = super.split(value, index, split);

        this.children[0] = new BTreeNode(
            this.order,
            this.keys,
            this.keyCount,
            this.children.slice(),
        );
        this.children[0].isLeaf = this.isLeaf;

        this.children[1] = new BTreeNode(
            this.order,
            split.keys.subarray(1),
            split.keyCount,
            split.children,
        );
        this.children[1].isLeaf = this.isLeaf;

        this.keys = new Uint8Array(this.order);
        this.keys[0] = split.keys[0];
        this.keyCount = 1;
        this.isLeaf = false;

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
            const index = binarySearch(node.keys, 0, node.keyCount - 1, value);
            if (index >= 0) {
                return true;
            }

            node = node.children[-index - 1];
            if (!node) {
                return false;
            }
        }
    }

    public insert(value: number) {
        this.root.insert(value);
    }
}
