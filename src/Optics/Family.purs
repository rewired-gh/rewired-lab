module Optics.Family (Complex, complex, fft, phase, pupil, front, evolution) where

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
-- production uses 2048. Each radix-2 stage is a pure map without aliased writes.
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

-- A symmetric three-control slice of the degree-six cuspoid family.
phase :: Number -> Number -> Number -> Number -> Number
phase mu a b t =
  let t2 = t * t
  in t2 * t2 * t2 / 6.0 + mu * t2 * t2 / 4.0 + a * t2 / 2.0 + b * t

pupil :: Number -> Number -> Number -> Complex
pupil mu a t =
  let
    p = 30.0 * phase mu a 0.0 t
    q = t / 1.3
    q2 = q * q
    q4 = q2 * q2
    w = exp (negate (q4 * q4))
  in complex (w * cos p) (w * sin p)

front :: Number -> Number -> Number -> { b :: Number, value :: Number, pa :: Number, pb :: Number, pmu :: Number }
front mu a t =
  let t2 = t * t
  in
    { b: negate (t2 * t2 * t + mu * t2 * t + a * t)
    , value: -5.0 * t2 * t2 * t2 / 6.0 - 0.75 * mu * t2 * t2 - 0.5 * a * t2
    , pa: t2 / 2.0
    , pb: t
    , pmu: t2 * t2 / 4.0
    }

evolution :: Number -> Number
evolution time = -0.5 + 1.3 * sin (time * 0.35)
