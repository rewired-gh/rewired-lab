module Optics.Cusp (Complex, complex, fft, aperture, phase, pupil, caustic, front) where

import Prelude
import Data.Array (length, range, unsafeIndex)
import Data.Int (toNumber)
import Data.Number (cos, sin, exp, pi)
import Partial.Unsafe (unsafePartial)

newtype Complex = Complex { re :: Number, im :: Number }
derive newtype instance eqComplex :: Eq Complex
instance semiringComplex :: Semiring Complex where
  zero = Complex { re: 0.0, im: 0.0 }
  one = Complex { re: 1.0, im: 0.0 }
  add (Complex a) (Complex b) = Complex { re: a.re + b.re, im: a.im + b.im }
  mul (Complex a) (Complex b) = Complex
    { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
instance ringComplex :: Ring Complex where
  sub (Complex a) (Complex b) = Complex { re: a.re - b.re, im: a.im - b.im }

complex :: Number -> Number -> Complex
complex re im = Complex { re, im }

-- Positive-sign, unnormalised DFT. Requires a positive power-of-two length;
-- production uses 8192. Each radix-2 stage is a pure map without aliased writes.
fft :: Array Complex -> Array Complex
fft input =
  let
    n = length input
    ids = range 0 (n - 1)
    reverseBits value width acc =
      if width <= 1 then acc
      else reverseBits (value / 2) (width / 2) (acc * 2 + mod value 2)
    at xs i = unsafePartial (unsafeIndex xs i)
    initial = map (\i -> at input (reverseBits i n 0)) ids
    stage width xs =
      if width > n then xs
      else
        let
          half = width / 2
          butterfly i =
            let
              offset = mod i width
              j = mod offset half
              start = i - offset
              angle = 2.0 * pi * toNumber j / toNumber width
              a = at xs (start + j)
              b = complex (cos angle) (sin angle) * at xs (start + j + half)
            in if offset < half then a + b else a - b
        in stage (width * 2) (map butterfly ids)
  in stage 2 initial

-- A smooth finite aperture, explicitly part of the model. This is not the
-- unwindowed canonical Pearcey integral over the whole real line.
aperture :: Number -> Number
aperture t =
  let
    q = t / 2.0
    q2 = q * q
    q4 = q2 * q2
  in exp (negate (q4 * q4))

phase :: Number -> Number -> Number -> Number
phase a b t = t * t * t * t / 4.0 + a * t * t / 2.0 + b * t

pupil :: Number -> Number -> Number -> Complex
pupil frequency a t =
  let
    p = frequency * phase a 0.0 t
    w = aperture t
  in complex (w * cos p) (w * sin p)

-- Simultaneous vanishing of the first two t-derivatives of phase.
caustic :: Number -> { a :: Number, b :: Number }
caustic t = { a: -3.0 * t * t, b: 2.0 * t * t * t }

-- The critical-value front, with contact momenta in the same coordinates.
front :: Number -> Number -> { a :: Number, b :: Number, value :: Number, pa :: Number, pb :: Number }
front a t =
  { a
  , b: negate (t * t * t + a * t)
  , value: -0.75 * t * t * t * t - 0.5 * a * t * t
  , pa: t * t / 2.0
  , pb: t
  }
