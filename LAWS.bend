# Contracts for the Bend rules called by the browser.
# PROOF.bend must discharge every law. No assumptions or unsafe proofs.
import Base
import ./game.bend as Game

# U32 score arithmetic is modulo 2^32, including the level multiplier.
# These tables cover every legal clear count at every U32 level.
law line_scores:
  for level: U32
  {Game.line_score(0, level) == 0 : U32} &
  {Game.line_score(1, level) == (100 * (level + 1 : U32) : U32) : U32} &
  {Game.line_score(2, level) == (300 * (level + 1 : U32) : U32) : U32} &
  {Game.line_score(3, level) == (500 * (level + 1 : U32) : U32) : U32} &
  {Game.line_score(4, level) == (800 * (level + 1 : U32) : U32) : U32}

law t_spin_scores:
  for level: U32
  {Game.t_spin_score(0, level) == (400 * (level + 1 : U32) : U32) : U32} &
  {Game.t_spin_score(1, level) == (800 * (level + 1 : U32) : U32) : U32} &
  {Game.t_spin_score(2, level) == (1200 * (level + 1 : U32) : U32) : U32} &
  {Game.t_spin_score(3, level) == (1600 * (level + 1 : U32) : U32) : U32}

# Level is the number of complete groups of ten cleared lines.
law level_counts_tens:
  for total_lines: U32
  {Game.level(total_lines) == (total_lines / 10 : U32) : U32}

# The complete uncapped curve, including the transition to the floor.
law gravity_curve:
  {Game.gravity_ms(0) == 785 : U32} &
  {Game.gravity_ms(1) == 730 : U32} &
  {Game.gravity_ms(2) == 675 : U32} &
  {Game.gravity_ms(3) == 620 : U32} &
  {Game.gravity_ms(4) == 565 : U32} &
  {Game.gravity_ms(5) == 510 : U32} &
  {Game.gravity_ms(6) == 455 : U32} &
  {Game.gravity_ms(7) == 400 : U32} &
  {Game.gravity_ms(8) == 345 : U32} &
  {Game.gravity_ms(9) == 290 : U32} &
  {Game.gravity_ms(10) == 235 : U32} &
  {Game.gravity_ms(11) == 180 : U32} &
  {Game.gravity_ms(12) == 125 : U32}

law gravity_stays_capped:
  for level: U32
  for capped: {U32.is_ge(level, 13) == True{} : Bool}
  {Game.gravity_ms(level) == 85 : U32}

# Geometry specification in coordinates, independent of the bitmap table.
# Valid piece ids are 0..6. Invalid ids are outside this contract.
type Piece is Data:
  I{}
  J{}
  L{}
  O{}
  S{}
  T{}
  Z{}

type Rotation is Data:
  R0{}
  R1{}
  R2{}
  R3{}

type Cell is Data:
  Cell{x: U32, y: U32}

def piece_id(piece: Piece) -> U32:
  match piece:
    case I{}: 0
    case J{}: 1
    case L{}: 2
    case O{}: 3
    case S{}: 4
    case T{}: 5
    case Z{}: 6

# Low bits encode the orientation; the other 30 bits are arbitrary.
def rotation_word(rotation: Rotation, turns: Word(30n)) -> U32:
  match rotation:
    case R0{}: U32{WCon{False{}, WCon{False{}, turns}}}
    case R1{}: U32{WCon{True{}, WCon{False{}, turns}}}
    case R2{}: U32{WCon{False{}, WCon{True{}, turns}}}
    case R3{}: U32{WCon{True{}, WCon{True{}, turns}}}

def spawn_cells(piece: Piece) -> List<Cell>:
  match piece:
    case I{}: [Cell{0, 1}, Cell{1, 1}, Cell{2, 1}, Cell{3, 1}]
    case J{}: [Cell{0, 1}, Cell{1, 1}, Cell{2, 1}, Cell{2, 2}]
    case L{}: [Cell{0, 1}, Cell{1, 1}, Cell{2, 1}, Cell{0, 2}]
    case O{}: [Cell{1, 1}, Cell{2, 1}, Cell{1, 2}, Cell{2, 2}]
    case S{}: [Cell{1, 1}, Cell{2, 1}, Cell{0, 2}, Cell{1, 2}]
    case T{}: [Cell{0, 1}, Cell{1, 1}, Cell{2, 1}, Cell{1, 2}]
    case Z{}: [Cell{0, 1}, Cell{1, 1}, Cell{1, 2}, Cell{2, 2}]

# I/O rotate about (1.5, 1.5); other pieces about (1, 1).
def rotation_edge(piece: Piece) -> U32:
  match piece:
    case I{}: 3
    case O{}: 3
    case _: 2

def turn_cells(cells: List<Cell>, +edge: U32) -> List<Cell>:
  match cells:
    case Nil{}: Nil{}
    case Con{Cell{x, y}, tail}:
      Cell{(edge - y : U32), x} <> turn_cells(tail, edge)

def oriented_cells(rotation: Rotation, cells: List<Cell>, +edge: U32) -> List<Cell>:
  match rotation:
    case R0{}: cells
    case R1{}: turn_cells(cells, edge)
    case R2{}: turn_cells(turn_cells(cells, edge), edge)
    case R3{}: turn_cells(turn_cells(turn_cells(cells, edge), edge), edge)

def bitmap(cells: List<Cell>) -> U32:
  match cells:
    case Nil{}: 0
    case Con{Cell{x, y}, tail}:
      U32.or(U32.shln(1, U32.to_nat((15 - (4 * y + x : U32) : U32))), bitmap(tail))

def cell_count(bits: Nat, +mask: U32) -> Nat:
  match bits:
    case 0n: 0n
    case 1n+rest:
      Nat.add(U32.to_nat(U32.and(mask, 1)), cell_count(rest, U32.shr(mask)))

# All seven pieces, all four orientations, and every U32 rotation argument:
# the bitmap is exactly the clockwise rotation of the specified spawn cells.
law tetromino_geometry:
  for piece: Piece
  for rotation: Rotation
  for turns: Word(30n)
  {Game.mask(piece_id(piece), rotation_word(rotation, turns)) ==
    bitmap(oriented_cells(rotation, spawn_cells(piece), rotation_edge(piece))) : U32}

law four_cells:
  for piece: Piece
  for rotation: Rotation
  for turns: Word(30n)
  {cell_count(32n, Game.mask(piece_id(piece), rotation_word(rotation, turns))) == 4n : Nat}

# Adding/removing any number of complete turns does not change the bitmap.
law complete_turns_do_not_change_shape:
  for piece: U32
  for rotation: Rotation
  for turns: Word(30n)
  {Game.mask(piece, rotation_word(rotation, turns)) ==
    Game.mask(piece, rotation_word(rotation, Word.zero(30n))) : U32}

law square_rotation_invariant:
  for rotation: U32
  {Game.mask(3, rotation) == 1632 : U32}
