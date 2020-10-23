export enum FieldType {
    Number,
    FixedLengthArray,
    VariableLengthArray,
}

export interface FieldDescriptorBaseOptions {

}

export interface FieldDescriptorBase<
    TName extends string = string,
    TResultObject = {},
    TInitObject = {},
    TOptions extends FieldDescriptorBaseOptions = FieldDescriptorBaseOptions
    > {
    type: FieldType | string;

    name: TName;

    options: TOptions;

    resultObject?: TResultObject;

    initObject?: TInitObject;
}
