export class ObjectUtil {
  public static isEmpty(object: object): boolean {
    return Object.keys(object).length === 0;
  }

  public static setObjectPropertyByPath = (
    object: object,
    path: string,
    value: any,
  ): void => {
    const parts = path.split('.');
    const length = parts.length - 1;

    for (let index = 0; index < length; index++) {
      const key = parts[index];
      object = (object as any)[key] ?? (object[key] = {});
    }

    const key = parts[length];
    object[key] = value;
  };
}
