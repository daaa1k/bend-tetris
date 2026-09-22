import Base

# Tetromino geometry and progression rules live in Bend. The browser asks this
# module for every active/preview shape, score award, level and fall interval.

def pick(-A: Data, c: Bool, a: A, b: A) -> A:
  match c:
    case True{}:
      a
    case False{}:
      b

def choose4(-A: Data, +n: U32, a: A, b: A, c: A, d: A) -> A:
  pick(A, U32.is_eq(n, 0), a,
    pick(A, U32.is_eq(n, 1), b,
      pick(A, U32.is_eq(n, 2), c, d)))

# A 4x4 bitmap, read from bit 15 (top-left) to bit 0 (bottom-right).
# Piece order: I, J, L, O, S, T, Z.
def mask(+piece: U32, +rotation: U32) -> U32:
  +r = (rotation % 4 : U32)
  pick(U32, U32.is_eq(piece, 0), choose4(U32, r, 3840, 8738, 240, 17476),
    pick(U32, U32.is_eq(piece, 1), choose4(U32, r, 3616, 25664, 1136, 17600),
      pick(U32, U32.is_eq(piece, 2), choose4(U32, r, 3712, 17504, 736, 50240),
        pick(U32, U32.is_eq(piece, 3), 1632,
          pick(U32, U32.is_eq(piece, 4), choose4(U32, r, 1728, 17952, 864, 35904),
            pick(U32, U32.is_eq(piece, 5), choose4(U32, r, 3648, 19520, 1248, 17984),
              choose4(U32, r, 3168, 9792, 1584, 19584)))))))

def line_score(+lines: U32, +level: U32) -> U32:
  base = choose4(U32, lines, 0, 100, 300, 500)
  tetris = pick(U32, U32.is_ge(lines, 4), 800, base)
  (tetris * (level + 1 : U32) : U32)

# Guideline-style T-spin awards, including a no-line spin reward.
def t_spin_score(+lines: U32, +level: U32) -> U32:
  base = choose4(U32, lines, 400, 800, 1200, 1600)
  (base * (level + 1 : U32) : U32)

def level(total_lines: U32) -> U32:
  (total_lines / 10 : U32)

def gravity_ms(+level: U32) -> U32:
  +reduction = (level * 55 : U32)
  pick(U32, U32.is_ge(reduction, 700), 85, (785 - reduction : U32))

# A small deterministic mixer used to seed each seven-piece bag shuffle.
def next_seed(+seed: U32) -> U32:
  +a = U32.xor(seed, U32.shln(seed, 13n))
  +b = U32.xor(a, U32.shrn(a, 17n))
  U32.xor(b, U32.shln(b, 5n))

def main() -> U32:
  line_score(4, 0)
