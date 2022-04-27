import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';

import LimitedItem from './LimitedItem';

export default class LimitedTradePreview {
  static async newImage(
    data: {
      image: string;
      value: number;
      rap: number;
    }[]
  ): Promise<Buffer> {
    const x = [29, 357.71, 686.41, 1015];
    const blankImage = await loadImage(path.join(__dirname, '../assets/images/limiteds/empty.png'));
    const images = await Promise.all(data.map(i => LimitedItem.newImage(i.image, i.rap, i.value)));
    const image = await loadImage(path.join(__dirname, '../assets/images/limiteds/trade.png'));
    const canvas = createCanvas(1332, 475);
    const ctx = canvas.getContext('2d');
    ctx.font = 'semi-bold 28px Inter';
    ctx.fillStyle = '#ffffff';
    ctx.drawImage(image, 0, 0, image.width, image.height);
    for (let index = 0; index <= 4; index += 1) {
      const i = images[index] ?? blankImage;
      ctx.drawImage(i, x[index], 28, i.width, i.height);
    }
    const rawRap = data.reduce((a, b) => a + b.rap, 0);
    const rawValue = data.reduce((a, b) => a + (b.value > 0 ? b.value : b.rap), 0);
    const rap = new Intl.NumberFormat('en-US').format(rawRap);
    const value = new Intl.NumberFormat('en-US').format(rawValue);
    const TEXT_STARTING_POINT = 1283;
    const TEXT_PADDING = 30;
    ctx.font = 'bold 35px Inter';
    ctx.fillStyle = '#50a550';
    ctx.fillText(
      rap,
      TEXT_STARTING_POINT +
        (canvas.width - (TEXT_STARTING_POINT + ctx.measureText(rap).width)) -
        TEXT_PADDING,
      395
    );
    ctx.fillStyle = '#4da2bb';
    ctx.fillText(
      value,
      TEXT_STARTING_POINT +
        (canvas.width - (TEXT_STARTING_POINT + ctx.measureText(value).width)) -
        TEXT_PADDING,
      440
    );
    return canvas.encode('png');
  }
}
