import { BTree, BTreeNode } from "@yume-chan/b-tree";
import {
    IAtom,
    IObservableValue,
    createAtom,
    makeAutoObservable,
    observable,
    onBecomeUnobserved,
} from "mobx";

const IS_MAC =
    typeof window != "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(globalThis.navigator.platform);

export function isModKey(e: { metaKey: boolean; ctrlKey: boolean }): boolean {
    if (IS_MAC) {
        return e.metaKey;
    } else {
        return e.ctrlKey;
    }
}

export class ObservableBTree implements Omit<BTree, never> {
    data: BTree;
    hasMap: Map<number, IObservableValue<boolean>>;
    keys: IAtom;

    constructor(order: number) {
        this.data = new BTree(order);
        this.hasMap = new Map();
        this.keys = createAtom("ObservableBTree.keys");
    }

    get order(): number {
        return this.data.order;
    }

    get size(): number {
        this.keys.reportObserved();
        return this.data.size;
    }

    has(value: number): boolean {
        if (!this.hasMap.has(value)) {
            const observableHasValue = observable.box(this.data.has(value));
            onBecomeUnobserved(observableHasValue, () =>
                this.hasMap.delete(value)
            );
            this.hasMap.set(value, observableHasValue);
        }
        return this.hasMap.get(value)!.get();
    }

    add(value: number): boolean {
        if (this.data.add(value)) {
            this.hasMap.get(value)?.set(true);
            this.keys.reportChanged();
            return true;
        }
        return false;
    }

    delete(value: number): boolean {
        if (this.data.delete(value)) {
            this.hasMap.get(value)?.set(false);
            this.keys.reportChanged();
            return true;
        }
        return false;
    }

    clear(): void {
        if (this.data.size === 0) {
            return;
        }
        this.data.clear();
        for (const entry of this.hasMap) {
            entry[1].set(false);
        }
        this.keys.reportChanged();
    }

    [Symbol.iterator](): Generator<number, void, void> {
        this.keys.reportObserved();
        return this.data[Symbol.iterator]();
    }
}

export class ObservableListSelection {
    selected = new ObservableBTree(6);
    rangeStart = 0;
    selectedIndex: number | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get size() {
        return this.selected.size;
    }

    has(index: number) {
        return this.selected.has(index);
    }

    select(index: number, ctrlKey: boolean, shiftKey: boolean) {
        if (this.rangeStart !== null && shiftKey) {
            if (!ctrlKey) {
                this.selected.clear();
            }

            let [start, end] = [this.rangeStart, index];
            if (start > end) {
                [start, end] = [end, start];
            }
            for (let i = start; i <= end; i += 1) {
                this.selected.add(i);
            }
            this.selectedIndex = index;
            return;
        }

        if (ctrlKey) {
            if (this.selected.has(index)) {
                this.selected.delete(index);
                this.selectedIndex = null;
            } else {
                this.selected.add(index);
                this.selectedIndex = index;
            }
            this.rangeStart = index;
            return;
        }

        this.selected.clear();
        this.selected.add(index);
        this.rangeStart = index;
        this.selectedIndex = index;
    }

    clear() {
        this.selected.clear();
        this.rangeStart = 0;
        this.selectedIndex = null;
    }

    [Symbol.iterator]() {
        return this.selected[Symbol.iterator]();
    }
}
