declare module 'pinyin-converter' {
  const PinyinConverter: {
    convert(text: string): string;
  };
  export default PinyinConverter;
}

declare module 'hanviet-pinyin-words' {
  export function getHanviet(tradHanzi: string, pinyinArray: string[]): string;
}
