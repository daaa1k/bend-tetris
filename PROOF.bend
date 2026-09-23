import Base
import ./game.bend as Game
import ./LAWS.bend as Laws

def Laws.line_scores(level):
  match level:
    case U32{bits}:
      ({==}, ({==}, ({==}, ({==}, {==}))))

def Laws.t_spin_scores(level):
  ({==}, ({==}, ({==}, {==})))

def Laws.level_counts_tens(total_lines):
  {==}

def Laws.gravity_curve():
  ({==}, ({==}, ({==}, ({==}, ({==}, ({==}, ({==}, ({==}, ({==}, ({==}, ({==}, ({==}, {==}))))))))))))

def Laws.gravity_stays_capped(level, capped):
  %Equal.sym(Bool, U32.is_ge(level, 13), True{}, capped) :
    {Game.pick(U32, _, 85, (785 - (level * 55 : U32) : U32)) == 85 : U32}
  {==}

def Laws.square_rotation_invariant(rotation):
  {==}

def Laws.complete_turns_do_not_change_shape(piece, rotation, turns):
  match rotation:
    case Laws.R0{}: {==}
    case Laws.R1{}: {==}
    case Laws.R2{}: {==}
    case Laws.R3{}: {==}

# Exhaustive case analysis; the 30 high rotation bits stay arbitrary.
def Laws.tetromino_geometry(piece, rotation, turns):
  match piece rotation:
    case Laws.I{} Laws.R0{}: {==}
    case Laws.I{} Laws.R1{}: {==}
    case Laws.I{} Laws.R2{}: {==}
    case Laws.I{} Laws.R3{}: {==}
    case Laws.J{} Laws.R0{}: {==}
    case Laws.J{} Laws.R1{}: {==}
    case Laws.J{} Laws.R2{}: {==}
    case Laws.J{} Laws.R3{}: {==}
    case Laws.L{} Laws.R0{}: {==}
    case Laws.L{} Laws.R1{}: {==}
    case Laws.L{} Laws.R2{}: {==}
    case Laws.L{} Laws.R3{}: {==}
    case Laws.O{} Laws.R0{}: {==}
    case Laws.O{} Laws.R1{}: {==}
    case Laws.O{} Laws.R2{}: {==}
    case Laws.O{} Laws.R3{}: {==}
    case Laws.S{} Laws.R0{}: {==}
    case Laws.S{} Laws.R1{}: {==}
    case Laws.S{} Laws.R2{}: {==}
    case Laws.S{} Laws.R3{}: {==}
    case Laws.T{} Laws.R0{}: {==}
    case Laws.T{} Laws.R1{}: {==}
    case Laws.T{} Laws.R2{}: {==}
    case Laws.T{} Laws.R3{}: {==}
    case Laws.Z{} Laws.R0{}: {==}
    case Laws.Z{} Laws.R1{}: {==}
    case Laws.Z{} Laws.R2{}: {==}
    case Laws.Z{} Laws.R3{}: {==}

# Exhaustive case analysis; the 30 high rotation bits stay arbitrary.
def Laws.four_cells(piece, rotation, turns):
  match piece rotation:
    case Laws.I{} Laws.R0{}: {==}
    case Laws.I{} Laws.R1{}: {==}
    case Laws.I{} Laws.R2{}: {==}
    case Laws.I{} Laws.R3{}: {==}
    case Laws.J{} Laws.R0{}: {==}
    case Laws.J{} Laws.R1{}: {==}
    case Laws.J{} Laws.R2{}: {==}
    case Laws.J{} Laws.R3{}: {==}
    case Laws.L{} Laws.R0{}: {==}
    case Laws.L{} Laws.R1{}: {==}
    case Laws.L{} Laws.R2{}: {==}
    case Laws.L{} Laws.R3{}: {==}
    case Laws.O{} Laws.R0{}: {==}
    case Laws.O{} Laws.R1{}: {==}
    case Laws.O{} Laws.R2{}: {==}
    case Laws.O{} Laws.R3{}: {==}
    case Laws.S{} Laws.R0{}: {==}
    case Laws.S{} Laws.R1{}: {==}
    case Laws.S{} Laws.R2{}: {==}
    case Laws.S{} Laws.R3{}: {==}
    case Laws.T{} Laws.R0{}: {==}
    case Laws.T{} Laws.R1{}: {==}
    case Laws.T{} Laws.R2{}: {==}
    case Laws.T{} Laws.R3{}: {==}
    case Laws.Z{} Laws.R0{}: {==}
    case Laws.Z{} Laws.R1{}: {==}
    case Laws.Z{} Laws.R2{}: {==}
    case Laws.Z{} Laws.R3{}: {==}
