module Geometry.Associate (sample) where

import Prelude

-- Complex jets form a ring. Multiplication propagates the derivative by the
-- product rule; the immersion and its tangent frame share one expression.
newtype Complex = Complex { re :: Number, im :: Number }
instance semiringComplex :: Semiring Complex where
  zero = Complex { re: 0.0, im: 0.0 }
  one = Complex { re: 1.0, im: 0.0 }
  add (Complex a) (Complex b) = Complex { re: a.re+b.re, im: a.im+b.im }
  mul (Complex a) (Complex b) = Complex { re: a.re*b.re-a.im*b.im, im: a.re*b.im+a.im*b.re }
instance ringComplex :: Ring Complex where
  sub (Complex a) (Complex b) = Complex { re: a.re-b.re, im: a.im-b.im }

newtype Jet = Jet { value :: Complex, derivative :: Complex }
instance semiringJet :: Semiring Jet where
  zero = Jet { value: zero, derivative: zero }
  one = Jet { value: one, derivative: zero }
  add (Jet a) (Jet b) = Jet { value: a.value+b.value, derivative: a.derivative+b.derivative }
  mul (Jet a) (Jet b) = Jet { value: a.value*b.value, derivative: a.derivative*b.value+a.value*b.derivative }
instance ringJet :: Ring Jet where
  sub (Jet a) (Jet b) = Jet { value: a.value-b.value, derivative: a.derivative-b.derivative }

constant :: Number -> Number -> Jet
constant re im = Jet { value: Complex { re, im }, derivative: zero }

type Component = { re :: Number, im :: Number, du :: Number, dv :: Number }
unpack :: Jet -> Component
unpack (Jet { value: Complex v, derivative: Complex d }) = { re: v.re, im: v.im, du: d.re, dv: negate d.im }

-- Integral of (1-g², i(1+g²), 2g) dz for g(z)=z².
-- Re(exp(i phase) W) is its associate family. No numeric differentiation.
sample :: Number -> Number -> Array Component
sample u v =
  let
    z = Jet { value: Complex { re: u, im: v }, derivative: one }
    z3 = z*z*z
    z5 = z3*z*z
    fifth = z5 * constant 0.2 0.0
  in map unpack [ z-fifth, constant 0.0 1.0 * (z+fifth), z3 * constant (2.0/3.0) 0.0 ]
