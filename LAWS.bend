# Bend / Tetris -- executable rules the implementation must keep.
#
# This file states the contract. PROOF.bend supplies the proofs, and
# `bend PROOF.bend` rejects the project if an implementation change breaks one.

import Base
import ./game.bend as Game

# Clearing no lines awards no line-clear points at the starting level.
law no_lines_no_points:
  {Game.line_score(0, 0) == 0 : U32}

# The scoring table awards 800 at level zero and applies the level multiplier.
law starting_tetris_score:
  {Game.line_score(4, 0) == 800 : U32}

law level_four_tetris_score:
  {Game.line_score(4, 4) == 4000 : U32}

# The square tetromino has the same bitmap in every rotation state.
law square_rotation_invariant:
  for rotation: U32
  {Game.mask(3, rotation) == 1632 : U32}

# Progression changes level at each ten-line boundary.
law first_level_boundary:
  {Game.level(9) == 0 : U32}

law second_level_begins:
  {Game.level(10) == 1 : U32}

# The gravity curve has a lower bound once its reduction reaches the cap.
law gravity_is_capped:
  {Game.gravity_ms(13) == 85 : U32}

# A zero xorshift state stays zero; the browser therefore avoids seeding it.
law zero_seed_is_fixed:
  {Game.next_seed(0) == 0 : U32}
