import { Canvas, createCanvas, loadImage } from '@napi-rs/canvas';
import humanFormat from 'human-format';
import path from 'path';

export default class LimitedItem {
  static async newImage(rawImage: string, rawRap: number, rawValue: number): Promise<Canvas> {
    const image = await loadImage(path.join(__dirname, '../assets/images/limiteds/item.png'));
    const itemImage = await loadImage(rawImage);
    const canvas = createCanvas(287.36, 307);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);
    ctx.drawImage(itemImage, 42.01, 23.77, 181.39, 196.4);
    ctx.font = 'semi-bold 28px Inter';
    ctx.fillStyle = '#ffffff';
    const rap = humanFormat(rawRap, { maxDecimals: rawRap >= 1_000_000 ? 0 : 2, separator: '' });
    const value =
      rawValue > 0
        ? humanFormat(rawValue, {
            maxDecimals: rawValue >= 1_000_000 ? 0 : 2,
            separator: '',
          })
        : '-';
    const TEXT_STARTING_POINT = 225.31;
    const TEXT_PADDING = 16.57;
    ctx.fillStyle = '#50a550';
    ctx.fillText(
      rap,
      TEXT_STARTING_POINT +
        (canvas.width - (TEXT_STARTING_POINT + ctx.measureText(rap).width)) -
        TEXT_PADDING,
      245
    );
    ctx.fillStyle = '#4da2bb';
    ctx.fillText(
      value,
      TEXT_STARTING_POINT +
        (canvas.width - (TEXT_STARTING_POINT + ctx.measureText(value).width)) -
        TEXT_PADDING,
      280
    );
    return canvas;
  }
}
