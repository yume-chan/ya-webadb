export class IntentBuilder {
    #action: string | undefined;
    #categories: string[] = [];
    #packageName: string | undefined;
    #component: string | undefined;
    #data: string | undefined;
    #type: string | undefined;

    setAction(action: string): this {
        this.#action = action;
        return this;
    }

    addCategory(category: string): this {
        this.#categories.push(category);
        return this;
    }

    setPackage(packageName: string): this {
        this.#packageName = packageName;
        return this;
    }

    setComponent(component: string): this {
        this.#component = component;
        return this;
    }

    setData(data: string): this {
        this.#data = data;
        return this;
    }

    build(): string[] {
        const result: string[] = [];

        if (this.#action) {
            result.push("-a", this.#action);
        }

        for (const category of this.#categories) {
            result.push("-c", category);
        }

        if (this.#packageName) {
            result.push("-p", this.#packageName);
        }

        if (this.#component) {
            result.push("-n", this.#component);
        }

        if (this.#data) {
            result.push("-d", this.#data);
        }

        if (this.#type) {
            result.push("-t", this.#type);
        }

        return result;
    }
}
