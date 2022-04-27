import { createCanvas, loadImage } from '@napi-rs/canvas';
import { container } from '@sapphire/framework';
import axios from 'axios';
import { isEmpty } from 'lodash';
import path from 'path';

import { AdoptMeItem as AdoptMeItemType } from '@/entities/GameTrade';

import AdoptMeItem from './AdoptMeItem';

export default class AdoptMeTradePreview {
  static async newImage(data: AdoptMeItemType[]): Promise<Buffer> {
    const x = [20, 240, 460];
    const y = [20, 244, 468];
    let rawImages = [];
    try {
      const res = await axios.get('https://thumbnails.roblox.com/v1/assets', {
        params: {
          assetIds: data.map(i => i.image_id).join(','),
          size: '150x150',
          format: 'Png',
        },
      });
      rawImages = res.data.data;
    } catch (e) {
      container.sentry.handleException(e);
    }
    const blankImage = await loadImage(path.join(__dirname, '../assets/images/adopt-me/item.png'));
    const images = await Promise.all(
      data.map(i =>
        AdoptMeItem.newImage(
          i,
          isEmpty(rawImages)
            ? 'https://devforum-uploads.s3.dualstack.us-east-2.amazonaws.com/uploads/original/4X/7/c/3/7c34eccaf268571661f00616fa85b67c21836175.png'
            : rawImages.find(j => j.targetId.toString() === i.image_id)?.imageUrl
        )
      )
    );
    const image = await loadImage(path.join(__dirname, '../assets/images/adopt-me/trade.png'));
    const canvas = createCanvas(680, 692);
    const ctx = canvas.getContext('2d');
    ctx.font = 'semi-bold 28px Inter';
    ctx.fillStyle = '#ffffff';
    ctx.drawImage(image, 0, 0, image.width, image.height);
    for (let index = 0; index <= 9; index += 1) {
      const i = images[index] ?? blankImage;
      ctx.drawImage(i, x[index % 3], y[Math.floor(index / 3)], i.width, i.height);
    }
    return canvas.encode('png');
  }
}
