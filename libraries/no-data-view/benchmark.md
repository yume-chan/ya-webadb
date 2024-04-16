## getUint16LittleEndian

| Name                  | Ops/s      | Avg Time   | Compare |
| --------------------- | ---------- | ---------- | ------- |
| getUint16LittleEndian | 19,892,072 | 50.271 ns  | 100.00% |
| cached DataView       | 18,810,767 | 53.161 ns  | 94.56%  |
| new DataView          | 7,585,290  | 131.834 ns | 38.13%  |

## getUint16BigEndian

| Name               | Ops/s      | Avg Time   | Compare |
| ------------------ | ---------- | ---------- | ------- |
| getUint16BigEndian | 19,553,782 | 51.141 ns  | 100.00% |
| cached DataView    | 19,919,910 | 50.201 ns  | 101.87% |
| new DataView       | 7,843,575  | 127.493 ns | 40.11%  |

## getUint16

| Name            | Ops/s      | Avg Time   | Compare |
| --------------- | ---------- | ---------- | ------- |
| getUint16       | 18,571,186 | 53.847 ns  | 100.00% |
| cached DataView | 19,434,597 | 51.455 ns  | 104.65% |
| new DataView    | 7,480,502  | 133.681 ns | 40.28%  |

## getInt16LittleEndian

| Name                 | Ops/s      | Avg Time  | Compare |
| -------------------- | ---------- | --------- | ------- |
| getInt16LittleEndian | 19,719,781 | 50.71 ns  | 100.00% |
| cached DataView      | 20,285,727 | 49.296 ns | 102.87% |
| new DataView         | 7,963,668  | 125.57 ns | 40.38%  |

## getUint32LittleEndian

| Name                  | Ops/s      | Avg Time   | Compare |
| --------------------- | ---------- | ---------- | ------- |
| getUint32LittleEndian | 20,037,121 | 49.907 ns  | 100.00% |
| cached DataView       | 19,750,168 | 50.632 ns  | 98.57%  |
| new DataView          | 8,127,370  | 123.041 ns | 40.56%  |

## getInt32LittleEndian

| Name                 | Ops/s      | Avg Time   | Compare |
| -------------------- | ---------- | ---------- | ------- |
| getInt32LittleEndian | 19,955,247 | 50.112 ns  | 100.00% |
| cached DataView      | 19,721,023 | 50.707 ns  | 98.83%  |
| new DataView         | 7,888,401  | 126.768 ns | 39.53%  |

## getUint64LittleEndian

| Name                  | Ops/s      | Avg Time   | Compare |
| --------------------- | ---------- | ---------- | ------- |
| getUint64LittleEndian | 19,438,620 | 51.444 ns  | 100.00% |
| cached DataView       | 16,597,547 | 60.25 ns   | 85.38%  |
| new DataView          | 6,957,942  | 143.721 ns | 35.79%  |

## getUint64BigEndian

| Name               | Ops/s      | Avg Time   | Compare |
| ------------------ | ---------- | ---------- | ------- |
| getUint64BigEndian | 20,075,843 | 49.811 ns  | 100.00% |
| cached DataView    | 16,787,123 | 59.569 ns  | 83.62%  |
| new DataView       | 7,469,821  | 133.872 ns | 37.21%  |

## getInt64LittleEndian

| Name                 | Ops/s      | Avg Time  | Compare |
| -------------------- | ---------- | --------- | ------- |
| getInt64LittleEndian | 20,167,285 | 49.585 ns | 100.00% |
| cached DataView      | 17,129,268 | 58.38 ns  | 84.94%  |
| new DataView         | 7,605,130  | 131.49 ns | 37.71%  |
