export enum BuiltInFieldType {
    Number,
    FixedLengthArrayBufferLike,
    VariableLengthArrayBufferLike,
}

export interface FieldDescriptorBaseOptions {

}

export interface FieldDescriptorBase<
    TName extends string = string,
    TResultObject = {},
    TInitObject = {},
    TOptions extends FieldDescriptorBaseOptions = FieldDescriptorBaseOptions
    > {
    type: BuiltInFieldType | string;

    name: TName;

    options: TOptions;

    resultObject?: TResultObject;

    initObject?: TInitObject;
}
