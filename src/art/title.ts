import { loadImage } from './henry';

export function loadTitleArtwork(): Promise<HTMLImageElement> {
  return loadImage(`${import.meta.env.BASE_URL}assets/title/tiny-turbo-trails-v2.png`);
}
