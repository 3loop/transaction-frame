import fs from 'fs/promises';
import path from 'path';
import { Font, FontStyle, FontWeight } from 'satori';

const loadFont = async (fileName: string) => {
  try {
    const filePath = path.join(__dirname, '../fonts', fileName);
    const fontData = await fs.readFile(filePath);
    return fontData;
  } catch (error) {
    console.error('Error reading font file:', error);
  }
}

export const fonts: Font[] = [
  {
    name: 'NotoSans',
    data: await loadFont('NotoSans-Regular.ttf'),
    weight: 400 as FontWeight,
    style: 'normal' as FontStyle,
  },
  {
    name: 'NotoSans',
    data: await loadFont('NotoSans-SemiBold.ttf'),
    weight: 600 as FontWeight,
    style: 'normal' as FontStyle,
  },
  {
    name: 'NotoSans',
    data: await loadFont('NotoSans-ExtraBold.ttf'),
    weight: 800 as FontWeight,
    style: 'normal' as FontStyle,
  },
];