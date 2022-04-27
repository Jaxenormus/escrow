import { Canvas, createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';

import { AdoptMeItem as AdoptMeItemType } from '@/entities/GameTrade';

export default class AdoptMeItem {
  static async newTrait(trait: string, color: string): Promise<Canvas> {
    const canvas = createCanvas(50, 50); // make the canvas bigger
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(25, 25, 15, 0, 2 * Math.PI); // draw the circle at a bigger size
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 25px Inter'; // use a larger font size
    ctx.fillText(trait, 25, 25);
    return canvas;
  }

  static async newImage(
    item: Omit<AdoptMeItemType, 'image_id'>,
    rawImage: string
  ): Promise<Canvas> {
    const image = await loadImage(path.join(__dirname, '../assets/images/adopt-me/item.png'));
    const itemImage = await loadImage(rawImage);
    const canvas = createCanvas(200, 204);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);
    ctx.drawImage(itemImage, 25, 25, itemImage.width, itemImage.height);
    let traits = [];
    if (item.properties.rideable) traits.push(AdoptMeItem.newTrait('R', '#F3136F'));
    if (item.properties.flyable) traits.push(AdoptMeItem.newTrait('F', '#178FC6'));
    if (item.properties.mega_neon) traits.push(AdoptMeItem.newTrait('M', '#4D00DC'));
    if (item.properties.neon) traits.push(AdoptMeItem.newTrait('N', '#7FC13A'));
    traits = await Promise.all(traits);
    for (let i = 0; i < traits.length; i += 1) {
      const trait = traits[i];
      ctx.drawImage(trait, 150 - 35 * i, 154, trait.width, trait.height);
    }
    return canvas;
  }
}
