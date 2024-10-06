def number_of_char_in(line, crlf=False):
    number_of_char = 0
    for char in line:
        # In JavaScript, a character represented by two positions in a string instead of one typically refers to characters that are part of the Unicode range beyond the Basic Multilingual Plane (BMP). These characters are known as "surrogate pairs."
        # The BMP characters are represented by Unicode code points from U+0000 to U+FFFF.
        # if ord(char) >= 0x10000:
        #     print(char)
        number_of_char += 2 if ord(char) >= 0x10000 else 1
        if crlf and char == '\n':
            number_of_char +=1
    return number_of_char

def generate_indices(cedict_path, ids_path, output_path, cedict_crlf, cedict_line_skip):
    cedict_idx = 0
    # store cedict index
    with open(cedict_path, "r", encoding="utf-8") as f:
        new_cedict_u8 = f.readlines()
    for line in new_cedict_u8[0:cedict_line_skip]:
        cedict_idx += number_of_char_in(line, cedict_crlf)

    index_dict = {}

    for line in new_cedict_u8[cedict_line_skip:]:
        words = line.strip().split()[:2]
        for word in set(words):  # Use set to avoid duplicates within the same line
            if word not in index_dict:
                index_dict[word] = { 'cedict':[], 'ids':None }
            index_dict[word]['cedict'].append(cedict_idx)
        cedict_idx += number_of_char_in(line, cedict_crlf)
    
    # store IDS index
    ids_idx = 0
    with open(ids_path, "r", encoding="utf-8") as f:
        ids_data = f.readlines()
    for line in ids_data:
        word = line.strip().split(':')[0]
        if word in index_dict:
            # only care about word already in cedict
            index_dict[word]['ids']=ids_idx + number_of_char_in(word) + 1 # +1 for colon symbol
        ids_idx += number_of_char_in(line)

    sorted_index = sorted(index_dict.items())
    
    with open(output_path, "w", encoding="utf-8") as f:
        for headword, values in sorted_index:
            cedict_idx_str = ','.join(map(str, values['cedict']))
            # must use space instead of other delimiters, because it has the lowest unicode value, so that when compare with other chars in findNeedle, it will always be before other chars
            ids_idx_str = (' '+str(values['ids'])) if values['ids'] is not None else ''
            f.write(f"{headword} {cedict_idx_str}{ids_idx_str}\n")

if __name__ == "__main__":
    generate_indices('../data/cedict.u8', "../data/ids.data", "../data/cedict.idx", True, 30)