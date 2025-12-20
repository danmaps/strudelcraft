// polyrhythm extravaganza
// https://strudel.cc/#CmxldCBhbmNob3IgPSBzb3VuZCgiYmQgfiB%2BIH4iKQoKbGV0IHBvbHlzID0gW10KCmZvciAobGV0IG4gPSAxOyBuIDw9IDU7IG4rKykgewogIHBvbHlzLnB1c2goCiAgICBzdGFjaygKICAgICAgc291bmQoInNkIikuZmFzdChuKS5nYWluKDAuNyksCiAgICAgIHNvdW5kKCJiZCIpLmZhc3QobisxKS5nYWluKDAuNiksCiAgICAgIChuICogKG4gKyAxKSA8PSAyMDAwKQogICAgICAgID8gc291bmQoImhoIikuZmFzdChuICogKG4gKyAxKSkuZ2FpbigwLjMpCiAgICAgICAgOiBzaWxlbmNlCiAgICApCiAgKQp9CgovLyB0dXJuIHBvbHlzIGludG8gWzEsIHBhdHRlcm5dIHBhaXJzLCBvbmUgY3ljbGUgZWFjaApsZXQgc2VxID0gYXJyYW5nZSguLi5wb2x5cy5tYXAocCA9PiBbMSwgcF0pKQoKJDogc3RhY2soCiAgYW5jaG9yLAogIHNlcQopLmJhbmsoIlJvbGFuZFRSOTA5IikK

let anchor = sound("bd ~ ~ ~")

let polys = []

for (let n = 1; n <= 5; n++) {
  polys.push(
    stack(
      sound("sd").fast(n).gain(0.7),
      sound("bd").fast(n+1).gain(0.6),
      (n * (n + 1) <= 2000)
        ? sound("hh").fast(n * (n + 1)).gain(0.3)
        : silence
    )
  )
}

// turn polys into [1, pattern] pairs, one cycle each
let seq = arrange(...polys.map(p => [1, p]))

$: stack(
  anchor,
  seq
).bank("RolandTR909")
