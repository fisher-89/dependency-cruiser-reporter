import {
  ExtensionCategory,
  RectCombo,
  register,
  type Point,
  type RectComboStyleProps,
} from '@antv/g6';

export function registerCustomCombo() {
  register(ExtensionCategory.COMBO, 'directory', DirectoryCombo);
}

class DirectoryCombo extends RectCombo {
  public getComboPosition({ x, y }: Required<RectComboStyleProps>): Point {
    return [x, y, 0];
  }

  protected getKeyStyle(attributes: Required<RectComboStyleProps>) {
    const style = super.getKeyStyle(attributes);
    style.x = 0;
    style.y = 0;
    if (Array.isArray(attributes.size) || attributes.size instanceof Float32Array) {
      style.width = attributes.size[0];
      style.height = attributes.size[1];
    } else {
      style.width = attributes.size;
      style.height = attributes.size;
    }
    return style;
  }
}
