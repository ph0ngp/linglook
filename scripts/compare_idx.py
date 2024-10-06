with open(r"../data/cedict.idx", "r", encoding = "utf-8") as f:
    lines1 = f.readlines()

with open(r"../data/cedict_gpt.idx", "r", encoding = "utf-8") as f:
    lines2 = f.readlines()

assert(len(lines1) == len(lines2))
# print(len(lines1))

for line1, line2 in zip(lines1, lines2):
    list1 = line1.split(',')
    list2 = line2.split(',')
    # assert char is the same
    assert(list1[0] == list2[0])
    # print(list1[0])
    list1.pop(0)
    id1 = set([int(element) for element in list1])
    list2.pop(0)
    id2 = set([int(element) for element in list2])
    # assert indices list are the same
    assert(id1 == id2)
    # print(id1)

print('OK. same number of lines, same characters, same indices')