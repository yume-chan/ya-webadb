const enum StructFieldType {
    Int32,
    FixedLengthString,
    LengthPrefixedBuffer,
}

interface StructFieldBase {
    type: StructFieldType;

    name: PropertyKey;
}

interface StructInt32Field extends StructFieldBase {
    type: StructFieldType.Int32;

    signed: boolean;
}

interface StructFixedLengthStringField extends StructFieldBase {
    type: StructFieldType.FixedLengthString;

    length: number;
}

interface StructLengthPrefixedBufferField extends StructFieldBase {
    type: StructFieldType.LengthPrefixedBuffer;

    lengthType: 'int32';

    subType: 'buffer' | 'string';
}

type StructField =
    StructInt32Field |
    StructFixedLengthStringField |
    StructLengthPrefixedBufferField;

export interface StructReader {
    decodeUtf8(buffer: ArrayBuffer): string;

    read(length: number): Promise<ArrayBuffer>;
}

export interface StructWriter {
    encodeUtf8(input: string): ArrayBuffer;
}

type KeyOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];

export type StructValueType<T extends Struct<unknown, unknown>> =
    T extends { parse(reader: StructReader): Promise<infer R> } ? R : never;

export type StructInitType<T extends Struct<unknown, unknown>> =
    T extends { create(value: infer R): any } ? R : never;

export default class Struct<T, TInit> {
    private littleEndian: boolean;

    private _size = 0;
    public get size() { return this._size; }

    private fields: StructField[] = [];

    private _extra?: any;

    public constructor(littleEndian = false) {
        this.littleEndian = littleEndian;
    }

    private clone(): Struct<any, any> {
        const result = new Struct<any, any>(this.littleEndian);
        result.fields = this.fields.slice();
        result._size = this._size;
        result._extra = this._extra;
        return result;
    }

    public int32<K extends PropertyKey>(name: K): Struct<
        T & { [KK in K]: number },
        T & { [KK in K]: number }
    > {
        const result = this.clone();
        result.fields.push({ type: StructFieldType.Int32, name, signed: true });
        result._size += 4;
        return result;
    }

    public uint32<K extends PropertyKey>(name: K): Struct<
        T & { [KK in K]: number },
        T & { [KK in K]: number }
    > {
        const result = this.clone();
        result.fields.push({ type: StructFieldType.Int32, name, signed: false });
        result._size += 4;
        return result;
    }

    public fixedLengthString<K extends PropertyKey, U = string>(
        name: K,
        length: number,
        _type?: U
    ): Struct<
        T & { [KK in K]: U },
        T & { [KK in K]: U }
    > {
        const result = this.clone();
        result.fields.push({ type: StructFieldType.FixedLengthString, name, length });
        result._size += 4;
        return result;
    }

    public lengthPrefixedBuffer<K extends PropertyKey>(
        name: K,
        lengthType: 'int32',
    ): Struct<
        T & { [KK in K]: ArrayBuffer },
        T & { [KK in K]: ArrayBuffer }
    > {
        const result = this.clone();
        result.fields.push({
            type: StructFieldType.LengthPrefixedBuffer,
            name,
            lengthType,
            subType: 'buffer'
        });
        result._size += 4;
        return result;
    }

    public lengthPrefixedString<K extends PropertyKey, U = string>(
        name: K,
        lengthType: 'int32',
        _type?: U
    ): Struct<
        T & { [KK in K]: U },
        T & { [KK in K]: U }
    > {
        const result = this.clone();
        result.fields.push({
            type: StructFieldType.LengthPrefixedBuffer,
            name,
            lengthType,
            subType: 'string',
        });
        result._size += 4;
        return result;
    }

    public extra<U extends object>(value: U): Struct<T & U, T> {
        const result = this.clone();
        result._extra = { ...result._extra, value };
        return result;
    }

    public create(value: TInit): T {
        return { ...value, ...this._extra } as any;
    }

    public async parse(reader: StructReader): Promise<T> {
        const result: any = {};
        let buffer: ArrayBuffer;
        let view: DataView;
        let length: number;
        for (const field of this.fields) {
            switch (field.type) {
                case StructFieldType.Int32:
                    buffer = await reader.read(4);
                    view = new DataView(buffer);
                    if (field.signed) {
                        result[field.name] = view.getInt32(0, this.littleEndian);
                    } else {
                        result[field.name] = view.getUint32(0, this.littleEndian);
                    }
                    break;
                case StructFieldType.FixedLengthString:
                    buffer = await reader.read(field.length);
                    result[field.name] = reader.decodeUtf8(buffer);
                    break;
                case StructFieldType.LengthPrefixedBuffer:
                    switch (field.lengthType) {
                        case 'int32':
                            buffer = await reader.read(4);
                            view = new DataView(buffer);
                            length = view.getUint32(0, this.littleEndian);
                            break;
                        default:
                            throw new Error();
                    }
                    buffer = await reader.read(length);
                    switch (field.subType) {
                        case 'buffer':
                            result[field.name] = buffer;
                            break;
                        case 'string':
                            result[field.name] = reader.decodeUtf8(buffer);
                            break;
                    }
                    break;
            }
        }
        return { ...result, ...this._extra };
    }

    public toBuffer(init: TInit, writer: StructWriter): ArrayBuffer {
        const value = this.create(init) as any;

        let size = this._size;
        for (const field of this.fields) {
            switch (field.type) {
                case StructFieldType.FixedLengthString:
                    value[field.name] = writer.encodeUtf8(value[field.name]).slice(0, field.length);
                    break;
                case StructFieldType.LengthPrefixedBuffer:
                    switch (field.subType) {
                        case 'string':
                            const buffer = writer.encodeUtf8(value[field.name]);
                            value[field.name] = buffer;
                            break;
                    }
                    size += value[field.name].byteLength;
                    break;
            }
        }

        const result = new Uint8Array(size);
        const view = new DataView(result.buffer);
        let offset = 0;
        let buffer: ArrayBuffer;
        let length: number;
        for (const field of this.fields) {
            switch (field.type) {
                case StructFieldType.Int32:
                    if (field.signed) {
                        view.setInt32(offset, value[field.name], this.littleEndian);
                    } else {
                        view.setUint32(offset, value[field.name], this.littleEndian);
                    }
                    offset += 4;
                    break;
                case StructFieldType.LengthPrefixedBuffer:
                    buffer = value[field.name];

                    length = buffer.byteLength;
                    view.setUint32(offset, length, this.littleEndian);
                    offset += 4;

                    result.set(new Uint8Array(buffer), offset);
                    offset += buffer.byteLength;
                    break;
                case StructFieldType.FixedLengthString:
                    buffer = value[field.name];
                    result.set(new Uint8Array(buffer), offset);
                    offset += buffer.byteLength;
                    break;
            }
        }
        return result;
    }
}
