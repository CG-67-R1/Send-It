# swingarm and chain dynamcs

Technical (bike setup / suspension) knowledge base. Source: PDF — "swingarm and chain dynamcs".

**Scraped**: 2026-02-23 | **Pages**: 25

---

Full Terms & Conditions of access and use can be found at
http://www.tandfonline.com/action/journalInformation?journalCode=nvsd20
Download by: [University of Arizona]Date: 08 May 2017, At: 02:57

### Vehicle System Dynamics
International Journal of Vehicle Mechanics and Mobility
ISSN: 0042-3114 (Print) 1744-5159 (Online) Journal homepage: http://www.tandfonline.com/loi/nvsd20
A study on the stability of a motorcycle
wheel–swingarm suspension with chain
transmission
S. Sorrentino & L. Leonelli
To cite this article: S. Sorrentino & L. Leonelli (2017): A study on the stability of a motorcycle
wheel–swingarm suspension with chain transmission, Vehicle System Dynamics, DOI:
10.1080/00423114.2017.1319962
To link to this article:  http://dx.doi.org/10.1080/00423114.2017.1319962
Published online: 07 May 2017.
Submit your article to this journal
View related articles
View Crossmark data

VEHICLE SYSTEM DYNAMICS, 2017
https://doi.org/10.1080/00423114.2017.1319962
A study on the stability of a motorcycle wheel–swingarm
suspension with chain transmission
S. Sorrentino and L. Leonelli
Department of Engineering Enzo Ferrari, University of Modena and Reggio Emilia, Modena, Italy
ABSTRACT
The present study describes a possible driving mechanism for a self-
excited oscillation observed in motorcycle dynamics, often referred
to as chatter. This phenomenon, affecting the performance of road
racing motorcycles, has been simulated in straight running brak-
ing manoeuvres with multibody motorcycle models. It involves rear
suspension bounce and driveline oscillation in the frequency range
between 17 and 22 Hz. A simplified model of a motorcycle rear
suspension with chain transmission is proposed and its stability in
equilibrium configurations is studied via eigenvalue analysis. The
sensitivity with respect to all its governing parameters is analysed
by means of stability maps and the self-excitation mechanism is
explained with the aid of energy balance analysis and phase dia-
grams. It is found that the key role for the instability onset is
played by the gradient of the nonlinear characteristic slip function of
the tyre.
ARTICLE HISTORY
Received 10 November 2016
Revised 9 March 2017
Accepted 31 March 2017
KEYWORDS
Motorcycle; stability; chatter;
driveline; slip stiffness

### 1. Introduction
The chatter of road racing motorcycles consists of a self-excited vertical oscillation of
both the front and rear unsprung masses in the frequency range between 17 and 22 Hz.
Several contributions to the understanding of this phenomenon have been presented,
highlighting different aspects. In fact, a number of authors considered the problem as
planar and focused on driveline and tyres during braking manoeuvres, while others anal-
ysed the stability of a three-dimensional motorcycle model during steady-state cornering
manoeuvres. More precisely, in [1] it is shown how an out-of-plane mode related to lat-
eral and radial deformability of tyres may become unstable when increasing the cornering
effort in steering pad tests. In [2] it is proved that the frame lateral and torsional flex-
ibilities may give rise to an out-of-plane unstable mode in a frequency range close to
the chatter one. On the other hand, in [3] the influence of tyre deformability is inves-
tigated on the stability of front wheel bounce in straight braking conditions. In [4,5]it
isfoundthataself-excitedvibrationmayshowupduringastraightrunningbraking
manoeuvre, due to the interaction between chain transmission and rear tyre, related to
CONTACTL. Leonelli
luca.leonelli@unimore.it, luca.leonelli4@gmail.com
Department of Engineering Enzo
Ferrari, University of Modena and Reggio Emilia, Via Vivarelli 10,41125 Modena, Italy
© 2017 Informa UK Limited, trading as Taylor & Francis Group

2S. SORRENTINO AND L. LEONELLI
theso-calledtransmission(driveline)mode,butitisstillnotclearwhichisitsdriving
mechanism.
In this study a simplified model of the rear suspension system of a road motorcy-
cle is considered, consisting of a 2 degrees of freedom (dofs) wheel–swingarm suspen-
sion with chain transmission, connected to a frame translating at an imposed constant
speed. Coupled to the equations of motion, a constitutive relation is introduced for the
small oscillations of the longitudinal ground slip force in both braking and traction
conditions [6,7].
The stability of the model is studied in several equilibrium configurations via eigenvalue
analysis, highlighting the sensitivity with respect to all its governing parameters by means
of analytically determined maps. Three configurations of increasing complexity for the
transmission are considered: chain disconnected, pinion centre on the swingarm line, pin-
ion centre out of the swingarm line, the last two cases studied in both braking and traction
conditions.
The source of the self-excited vibration is then investigated by means of energy balance
analysis and phase diagrams, aimed at explaining its driving mechanism and at identifying
which parameters play a major role in the actual vibration onset.

### 2. Model description
The model consists of a wheel–swingarm suspension with chain transmission, connected
to a frame translating at an imposed constant speedV
0
on a perfectly flat surface, as
represented in Figure1.
The equations of motion are linearised around an equilibrium configuration (denoted
by subscript 0), characterised by a longitudinal slipκ
0
due to a forceF
c0
applied by the
Figure 1.Schematic of the model.

VEHICLE SYSTEM DYNAMICS3
chain transmission in braking (as represented in Figure1) or traction conditions. The lin-
earised model has two degrees of freedom: the rotation angleθof the rim and the vertical
displacementzof its axle. The rotating inertia of the pinion is assumed to be infinite and
the rolling resistance is neglected.

### 2.1. Linearised equilibrium equations in the simplest case
If the pinion centre is coincident with the swingarm pivot (l
p
=0inFigure1)andthe
pinion radiusr
p
is equal to the rear wheel sprocket radiusr
c
, then the equations of motion

### for the small oscillations can be written in the following simple form:
m
̈
z+c
s
̇
z+(k
s
+k
z
)z=F
x
τ+F
x0
τ

z
J
̈
θ+k
c
r
2
c
θ=−(F
x
ρ+F
x0
ρ

z)
(1)
whereF
x0
andF
x
are, respectively, the stationary and fluctuating components of the longi-
tudinal ground force,Jis the moment of inertia of the wheel with respect to its axle,c
s
and
k
s
are the suspension equivalent damping and stiffness coefficients,k
z
is the radial stiffness
of the tyre,k
c
is the chain stiffness,ρis the outer radius of the deformed tyre, which in the
following will be approximated with the free outer radiusr
0
(ρ
∼
=
r
0
),ρ

is its derivative
with respect toz(ρ

=−1),τis the tangent of the swingarm angleα
0
andτ

its derivative

### with respect toz:
τ=tanα
0
,τ

=
dtan(α)
dz




0
(2)

### Finally,mistheequivalenttranslatingmassinthezdirection:
m=
m
0
l
2
sa
+J
sa
l
2
sa
cos
2
α
0
(3)
withm
0
representing the total mass of the wheel,l
sa
the swingarm length andJ
sa
the
moment of inertia of the swingarm with respect to its rotation axis.

### 2.2. Constitutive equation of the vertical ground force
The non-stationary componentF
z
oftheverticalgroundforce,linearisedneglectingthe
radial damping of the tyre (not considered in the present analysis), is given by:
F
z
=−k
z
z(4)
which has been implicitly included in the first of Equations (1). Notice thatF
z
is not the total
non-stationary part of the vertical ground force as represented in the scheme of Figure1,
butonlythecomponentduetothetyre.Thismakesthemodelmoreconsistentwiththat
of a motorcycle, which has a suspended mass, and not a frame rigidly connected to the
ground.

4S. SORRENTINO AND L. LEONELLI

### 2.3. Constitutive equation of the longitudinal ground force
In order to obtain the constitutive equation for the longitudinal ground force, the definition

### of the longitudinal slip coefficientκis considered:
κ=−
V
s
V
(5)
in whichVis the translating velocity of the axle of the rim andV
s
is the slip velocity [8].
Therefore, assuming a positive value forV,thesignofκwill be negative in braking con-
ditions and positive in traction conditions. In equilibrium configuration, the longitudinal
slip coefficientκ
0
can be expressed as a function of both the rim angular velocity
0
and
the free rolling radiusR
0
of the wheel, sinceV
s0
=V
0
−R
0

0

### :
κ
0
=−

1−
R
0

0
V
0

(6)
Given
0
andV
0
, the effective rolling radiusR
κ0

### of the wheel with slip is:
R
κ0
=
V
0

0
⇒
R
0
R
κ0
=1+κ
0
(7)
Hence in the case of small oscillations around an equilibrium configuration,κtakes the

### form:
κ=−

1−
R
V

⇔κ
0
+ ̃κ=−

1−
(R
0
+
̃
R)(
0
+
̃
)
V
0
+
̃
V

(8)
whereRisthefreerollingradiusofthewheelandthesymbol∼denotes the non-stationary

### components ofκ,R,andV. The last two of them can be detailed as follows:
̃
=
̇
θ
c
+
̇
θ
b
̃
V=
̇
x+l
sa
̇φsin(α
0
+φ)
(9)
in which
̇
θ
c
is the non-stationary component of the angular velocity of the rim,
̇
θ
b
is the
torsional rate of deformation of the tyre [6],
̇
xis the non-stationary component of the lon-
gitudinal velocity of the swingarm pivot, andφis the non-stationary part of the swingarm
angleα.Thenon-stationarycomponentofκcan then be linearised aroundκ
0
with respect

### toR,andV:
̃κ=
∂κ
∂R




κ
0
̃
R+
∂κ
∂




κ
0
̃
+
∂κ
∂V




κ
0
̃
V
=

0
V
0
̃
R+
R
0
V
0
(
̇
θ
c
+
̇
θ
b
)−
R
0

0
V
2
0
[
̇
x+l
sa
̇φsin(α
0
+φ)](10)
which, after introducing the first of Equations (7) and linearising also with respect toφ

### (small variation ofα), yields:
̃κ=
1
V
0


0
̃
R+R
0
(
̇
θ
c
+
̇
θ
b
)−
R
0
R
κ0
(
̇
x+l
sa
̇φsinα
0
)

(11)
The non-stationary component of the free rolling radiusRcan be expressed as a function
of the coordinatezby means of the dimensionless parameterη, accounting for the vertical

VEHICLE SYSTEM DYNAMICS5

### position of the centre of rotation below the ground level [6]:
̃
R=−(1−η)zwith 0≤η≤1(12)
which means that the free rolling radius changes with tyre deflection at a rate given by the
factor(1−η). Taking into account Equations (7), (12) and the congruence relation linking
φandz
l
sa
φ=
z
cosα
0
(13)

### Equation (11) can then be rewritten in the form:
̃κ=
1
V
0

R
0
(
̇
θ
c
+
̇
θ
b
)−(1+κ
0
)

̇
x+τ
̇
z+
V
0
R
0
(1−η)z


(14)
The linearised non-stationary componentF
x
of the longitudinal slip force can now be
definedasafunctionofboth ̃κand the linearised non-stationary componentF
z
of the

### vertical ground force:
F
x
=C
κ0
̃κ+δχF
z
(15)
whereC
κ0
denotes the stationary slip stiffness of the tyre evaluated at a longitudinal slipκ
0
under the stationary component of the vertical ground forceF
z0
, while the factorsδandχ
express the local dependency ofF
x0
with respect toF
z0

### :
C
κ0
=

∂F
x0
∂κ
0

F
z
=F
z0
,δ=sign

∂F
x0
∂F
z0

κ=κ
0
andχ=




∂F
x0
∂F
z0




κ=κ
0
(16)
As a consequence,δalso identifies which segment of the chain is taut (the lower segment

### in braking, the upper one in traction):
δ=

+1braking
−1traction
(17)
Even though the two parametersC
κ0
andχin Equation (15) appear to be mathematically
independent, in fact they are related to the stationary equilibrium point on the nonlinear
characteristic slip function of the tyreF
x0
(κ
0
,F
z0
), usually described by analytical regular
surfaces obtained with a semi-empirical approach known as Magic Formulas (MFs) [8].
A typical (normalised) MF surface for the rear tyre of a road racing motorcycle is shown
in Figure2. The expression of ̃κin Equation (14) can be simplified by considering that
̇
x=0 (since the translating velocity of the frame in Figure1 is assumed to be constant), by
approximating the steady-state free rolling radius with the free outer radius of the wheel,
i.e.R
0
∼
=
r
0
[6 ], and by expressingθ
b
as a function ofF
x

### :
θ
b
=−
F
x
k
x
r
0
(18)

6S. SORRENTINO AND L. LEONELLI
Figure 2.Example of (normalised) characteristic slip function of the tyreF
x0
(κ
0
,F
z0
).
wherek
x
represents the longitudinal structural stiffness of the tyre at the contact point.

### Introducing Equations (4), (14) and (18) in (15) yields [6,7]:
l
r
V
0
̇
F
x
+F
x
=
C
κ0
V
0

r
̇
θ
c
−(1+κ
0
)

τ
̇
z+
V
0
r
(1−η)z


−δχk
z
zwithl
r
=
C
κ0
k
x
(19)

### Assumingarelaxationlengthl
r
of the tyre so small to be negligible, Equation (19) reduces

### to:
F
x
=
C
κ0
V
0

r
0
̇
θ−(1+κ
0
)

τ
̇
z+
V
0
r
0
(1−η)z


−δχk
z
z(20)

### Three dimensionless parametersγ,υandλare now defined according to:
γ=
C
κ0
c
s
V
0
,υ=1+κ
0
=1−δ|κ
0
|,λ=δχ
k
z
k
+υ
C
κ0
kr
0
(1−η),withk=k
s
+k
z
(21)

### yielding a simplified expression of the constitutive Equation (20):
F
x
=γc
s
[r
0
̇
θ−υτ
̇
z]−λkz(22)
which highlights the dependency ofF
x
on the coordinates and their time derivatives.

VEHICLE SYSTEM DYNAMICS7

### 2.4. Constitutive equation of the chain transmission force
The stationary componentF
c0
of the transmission force is given by the spring which models

### thetautchainsegment:
F
c0
=k
c
(l
0
−l
f
)(23)
withl
0
andl
f
representing the stationary and free lengths of the spring, respectively
(l
0
>l
f
). It can also be expressed as a function ofF
x0

### :
F
c0
=−δF
x0
r
0
r
−1
c
(24)
In general, the line of action ofF
c0
forms an angle with respect to the swingarm line (say
ψ
0

### ,whichinFigure1is referred to the case of braking):
sinψ
0
=
1
d
2
0
[l
0
l
p
sinβ
0
+δ(r
c
−r
p
)(l
sa
+l
p
cosβ
0
)](25)
whereβ
0
is the angle between the swingarm line and the direction of the segment of length
l
p
(as represented in Figure1)andd
0
is the distance between the centres of the pinion and

### of the rear-wheel sprocket:
d
2
0
=l
2
sa
+l
2
p
+2l
sa
l
p
cosβ
0
l
0
=

d
2
0
−(r
c
−r
p
)
2
(26)
The expression ofψ
0
in Equation (25) can be obtained by considering separately the
anglesψ
1
andψ
2
as represented in Figure3, left, whereψ
1
is the angle between the direc-
tion of the segment of lengthd
0
and the direction ofF
c0
,andψ
2
is the angle between the
swingarm line and the direction of the segment of lengthd
0
, both angles evaluated in the

### equilibrium configuration:
ψ
0
=ψ
1
+ψ
2
,
⎧
⎪
⎪
⎨
⎪
⎪
⎩
sinψ
1
=
r
c
−r
p
d
0
,cosψ
1
=
l
0
d
0
sinψ
2
=
l
p
sinβ
0
d
0
=
h
0
d
0
,cosψ
2
=
l
sa
+l
p
cosβ
0
d
0
(27)
withh
0
representing the distance of the pinion centre from the swingarm line, as shown in

### Figure3, left. Introducing the factorδas defined in Equations (16) and (17):
ψ
0
=δψ
1
+ψ
2
(28)
Figure 3.Schematic of the chain transmission.

8S. SORRENTINO AND L. LEONELLI
then Equation (25) follows immediately from Equations (27) and (28). The linearised
non-stationary componentF
c
of the chain transmission force is obtained neglecting the
transmission damping, starting from the expression of the potential energy of the spring

### which models the taut chain segment:
E
c
=
1
2
k
c
(l−l
f
)
2
(29)
wherelrepresents the actual length of the spring. Considering a small (non-stationary )
rotationφof the swingarm around the pivot, which modifies the equilibrium configuration
(α=α
0
+φ,β=β
0
−φ), and that the rotation of the pinion is stationary, thenlcan be
expressed as a function ofφandθ. Recalling Equations (26) and the factorδas defined in

### Equations (16) and (17):
l(φ,θ)=l(φ)+l(θ)
l(φ)=

d
2
−(r
c
−r
p
)
2
+δ(r
c
−r
p
)φ
1
with
d
2
=l
2
sa
+l
2
p
+2l
sa
l
p
cos(β
0
−φ)
l(θ)=δ(r
c
θ
c
−r
p
θ
p
)withθ
c
=θ,θ
p
=0
(30)
in which the angleφ
1
represents a small (non–stationary) rotation of the segment of length

### d(Figure3, right), due to a small rotationφof the swingarm around its pivot:
φ
1
=

l
sa
d
0
cosψ
2

φ(31)

### and thereforel(φ)can be linearised as:
l(φ)
∼
=
l(0)+
dl
dφ




0
φ=l
0
+

l
p
sinβ
0
l
0
+δ(r
c
−r
p
)
l
sa
+l
p
cosβ
0
d
2
0

l
sa
φ(32)
Introducing Equations (32) and (13) in Equation (30) yieldslas a linear function ofzand

### θ:
l(z,θ)=l
0
+

l
p
sinβ
0
l
0
cosα
0
+δ(r
c
−r
p
)
l
sa
+l
p
cosβ
0
d
2
0
cosα
0

z+δr
c
θ(33)
A dimensionless stationary parameterσis now defined, characterising the whole geometry

### of the chain transmission:
σ=
r
0
r
c
cosα
0

l
p
sinβ
0
l
0
+δ(r
c
−r
p
)
l
sa
+l
p
cosβ
0
d
2
0

=
r
0
r
c
cosα
0

sinψ
0
+
(r
c
−r
p
)
2
d
2
0
l
p
sinβ
0
l
0

(34)

### which, introduced in Equation (33), yields:
l(z,θ)=l
0
+r
c
(σr
−1
0
z+δθ)(35)

VEHICLE SYSTEM DYNAMICS9
If eitherl
p
l
sa
,orβ
0
∼
=
0, orr
p
∼
=
r
c
,thenσwould essentially account for the effect of
the angleψ
0

### as defined in Equation (25):
σ
∼
=
r
0
r
c
sinψ
0
cosα
0
(36)
which holds in most cases of practical interest. The linearised non–stationary compo-
nents of the chain transmission force with respect tozandθcan now be derived from

### Equation (29):
F
cz
=

∂
2
E
c
∂z
2

0
z+

∂
2
E
c
∂z∂θ

0
θ=k
c


∂l
∂z

2
0
+(l
0
−l
f
)

∂
2
l
∂z
2

0

z+k
c

∂l
∂z
∂l
∂θ

0
θ
F
cθ
=

∂
2
E
c
∂z∂θ

0
z+

∂
2
E
c
∂θ
2

0
θ=k
c

∂l
∂z
∂l
∂θ

0
z+k
c

∂l
∂θ
2

2
0
θ
(37)
Introducingl(z,θ), Equation (35), and disregarding second-order approximation terms

### yields:
F
cz
=k
c
r
2
c
r
−1
0
(σ
2
r
−1
0
z+δσθ)
F
cθ
=k
c
r
2
c
(δσr
−1
0
z+θ)
(38)
Notice that the forceF
c
implicitly appears only in the second of Equations (1), due to the
assumptionsl
p
=0andr
p
=r
c
(i.e.σ=0).

### 2.5. Linearised equations of motion in the general case
Removing the simplifying assumptionsl
p
=0andr
p
=r
c
, the equations of motion (1) can
now be written in a more general form, recalling thatρ
∼
=
r
0
,ρ

=−1 and introducing

### Equations (38):
m
̈
z+c
s
̇
z+(k
s
+k
z
+σ
2
k
c
r
2
c
r
−2
0
)z+(δσk
c
r
2
c
r
−1
0
)θ=F
x
τ+δF
x0
τ

z
J
̈
θ+(δσk
c
r
2
c
r
−1
0
)z+(k
c
r
2
c
)θ=−F
x
r
0
+δF
x0
z
(39)
After substituting the constitutive equation ofF
x
(Equation (22)) in Equations (39), a fur-
ther set of dimensionless parameters is introduced. A mass ratioμ, a damping ratioζ,a

### stiffness ratioφand a force ratiofare defined as:
μ=
mr
2
0
J
,ζ=
c
s
2
√
km
,φ=
k
c
r
2
c
kr
2
0
,f=
|F
x0
|
kr
0
(40)
Equations (39), rewritten introducing the dimensionless parameters, Equations (40), yield

### the following eigenproblem:
[Mu
2
+Cu+K]y=0,y=

z
r
0
θ

,u=
s
ω
z
withω
z
=

k
m
(41)

10S. SORRENTINO AND L. LEONELLI
wheresis the Laplace variable and the matricesM,CandKcan be expressed in the form:
M=

10
0μ
−1

C=

2ζ0
00

+2ζγ

υτ
2
−τ
−υτ1

K=

10
0φ

+φ

σ
2
δσ
δσ0

+λ

τ0
−10

−δf

ξ0
10

(42)
in which the dimensionless parameterξisafunctionofτ


### :
ξ=r
0
τ

(43)
The latter,fdependent, term in matrixKis negligible if|F
x0
|kr
0
, which holds in most
cases of practical interest. Then the eigenproblem would depend explicitly on nine param-
eters, i.e.υ,τ,μ,ζ,φ,δ,σ,γ,λ, while the matricesCandKwould be diagonal ifτ=0,

### σ=0andλ=0. BothCandKare non-symmetric, due toυ,λandf.Thecharacteristic

### equation descending from the eigenproblem Equations (41) reads:
a
4
u
4
+a
3
u
3
+a
2
u
2
+a
1
u+a
0
=0(44)

### with:
a
4
=1
a
3
=2ζ{1+γ[μ+υτ
2
]}
a
2
=1+φ(μ+σ
2
)+(2ζ)
2
μγ−δfξ+τλ=a
20
+a
21
λ
a
1
=2ζμ{φ+γ[1−δf(ξ+τ)+φ[σ
2
+δστ(1+υ)+υτ
2
]]}
a
0
=φμ{1−δf(ξ−δσ)+λ(τ+δσ)}=a
00
+a
01
λ
(45)
where the coefficientsa
20
,a
21
,a
00
anda
01
highlight the linear dependency ofa
2
anda
0
with respect toλ.Settingσ=0 in Equations (42) and (45) yields the simplified model
described by Equations (1).

### 2.6. Expression of the stability maps
Since the coefficients of the characteristic Equation (44) can be considered as linear func-
tions of parameterλ,thestabilitymapscanbeeasilyexpressedasfunctionsλ
lim
(γ ),
highlighting the effects of the two most influential parameters in the model ofF
x
,
Equation (22).
AccordingtotheRouth–Hurwitzcriterion[9], if the coefficients Equations (45) are all

### positive, then the critical equation:
a
2
1
−a
1
a
2
a
3
+a
0
a
2
3
=0(46)

### gives the following stability threshold:
λ
lim
1
=
a
2
1
+a
00
a
2
3
−a
20
a
1
a
3
a
21
a
1
a
3
−a
01
a
2
3
(47)

VEHICLE SYSTEM DYNAMICS11

### which, for very small values ofγ, yields:
lim
γ→0
λ
lim
1
=δ(φσ−f)(48)
The coefficienta
4
is always positive. Within the parameter variation ranges of interest for
the present study (see Section3.1) also the coefficientsa
3
anda
1
can be considered always
positive. For some values ofλ, however, the coefficientsa
2
anda
0
may become negative.
Therefore, when defining the stability bounds as functions ofλ, the following additional

### thresholds must be considered:
λ
lim
2
=−
a
20
a
21
,λ
lim
3
=−
a
00
a
01
(49)
The relationλ(χ )in Equations (21) makes it also possible to express the stability maps
in the formχ
lim
(γ ), by means of Equations (47) and (49). In general, the stability maps
λ
lim
(γ )andχ
lim
(γ )take into account also the effect of theC
κ0
–dependent term in the
definition ofλgiven by Equations (21). If this term can be disregarded (due toη,asinthe
case under study: see Section3.1), thenλandχare directly proportional and the difference
between the maps is simply given by a scaling factor (as in most cases considered in the
following sections, in which the use ofλ
lim
(γ )orχ
lim
(γ )can be regarded as indifferent).
Notice that, in general,λandχare both independent from the velocityV
0
,whichinflu-
ences the stability mapsλ
lim
(γ ),χ
lim
(γ )only through parameterγ. Therefore, recalling
again Equations (21), for fixed values of both the damping coefficientc
s
and the stationary
slip stiffnessC
κ0
,atthelimitofstabilitythecriticalspeedV
crit
0
is inversely proportional to
γ
lim

### , i.e.:
V
crit
0
=
C
κ0
c
s
γ
lim
(50)
Atλ
lim
1
,thestabilitythresholdofmajorinterestforthepresentstudy,thecharacteristic

### equation (44) can be factorised as:
(a
3
u
2
+a
1
)[(a
21
a
1
−a
01
a
3
)(u
2
+a
3
u)+a
01
a
1
+a
3
(a
00
a
21
−a
01
a
20
)]=0   (51)
hence atλ
lim
1
the eigenvaluesu
lim
and the eigenfrequencyω
lim

### are:
u
lim
1,2
=±i

a
1
a
3
=±iu
l
⇒ω
lim
=ω
z
u
l
(52)

### and a normalised modal shape (right eigenvector) can be expressed as:
z
lim
01
=1⇒r
0
θ
lim
01
=−
{1−u
2
l
+φσ
2
−δfξ+τλ}+i{2ζu
l
[1+υτ
2
γ]}
{δφσ}−i{2ζu
l
τγ}
(53)
Equation (53) gives rise to a complex quantity, therefore the motion of the two degrees of
freedom is out-of-phase.

### 3. Stability analysis
The sensitivity of the stability mapsλ
lim
(γ )andχ
lim
(γ )is studied with respect to all the
governing parameters of the model, on the basis of a set of values adopted as reference.

12S. SORRENTINO AND L. LEONELLI

### 3.1. Reference values for the parameters
The reference set of values (reported in Table1)isrelatedtoastraightrunningbraking
manoeuvre (δ=1) performed by a road racing motorcycle. Some parameters are totally
independent from the manoeuvre considered (third column, and inertial parameters),
some of them are slightly dependent (stiffness parameters, chain and swingarm angles),
the remaining ones characterise the manoeuvre itself.
It should be remarked that during a real braking manoeuvre of a motorcycle some of the
parameters in Table1 (stiffness and angles, plus those characterising the manoeuvre itself)
would be time dependent (due to nonlinear stiffness characteristics and to the variation of
both the velocity and the longitudinal load transfer), while in the proposed model, as a con-
sequence of assuming a constant travelling speed, they are all time independent and define
an equilibrium configuration (extension to time-varying parameters will be addressed in
future work).
AccordingtothevaluesinTable1:m=21.1 kg,d
0
=743 mm,l
0
=741 mm,
ψ
0
=0.12 rad,l
r
=3 mm. The dimensionless parameters which, along withδ=1, define
the coefficients of the characteristic equation (45) are reported in Table2. The sensitivity of
the stability mapsλ
lim
(γ )andχ
lim
(γ )is studied in the domainγ∈[0.1, 1.0]. The range
of variation considered for the other parameters is reported in Table2. Notice that, when
studying the traction case, the reference values ofτ,μ,ζandφwill be retained as in Table2,
whileυandσwill be modified only by settingδ=−1 in their respective definitions.
Therefore, traction cases in whichftakeslargervaluesarenotconsideredinthisstudy.
Regarding parameterη, realistic values for tyres of road racing motorcycles vary in the
range between 0.90 and 0.95. As a consequence, the second term in the definition ofλ,

### Equation (21), has negligible influence. Hence:
λ
∼
=
δχ
k
z
k
(54)
which means that in most cases of practical interestλcan be considered independent from
C
κ0
, and directly proportional toχ.

### 3.2. Chain disconnected
The equations of motion (1) are considered withk
c
=0, i.e. in free rolling conditions
(neglecting the rolling resistance). Recalling Equations (21), (40) and (45) it follows
Table 1.Reference set of parameters.
m
0
=16(kg)c
s
=1.2·10
3
(Ns/m)l
sa
=0.65(m)α
0
=0.20(rad)
J
sa
=1.80(kg m
2
)k
s
=2.0·10
4
( N/m )l
p
=0.10(m)β
0
=0.40(rad)
J=0.95(kg m
2
)k
c
=1.5·10
6
( N/m )r
0
=0.32(m)V
0
=100( km/h )
κ
0
=−5( % )k
z
=1.5·10
5
( N/m )r
c
=0.10(m)F
x0
=−0.4×10
3
(N)
k
x
=1.5·10
6
( N/m )r
p
=0.04(m)C
κ0
=0.5×10
4
(N)
Table 2.Dimensionless set of parameters, with bounds of variation.
τ=0.20271,τ∈[0, 0.35]σ=0.43492,σ∈[−0.5, 0.5]γ=0.15
μ=2.27359,μ∈[2.0, 2.5]ζ=0.31685,ζ∈[0.2, 0.5]λ=0.75873
υ=0.95,υ∈[0, 2]f=0.00735,f∈[0, 0.01]χ=0.85
φ=0.86167,φ∈[0.7, 1.1]ξ=0.52296,ξ∈[−1, 1]η=0.90

VEHICLE SYSTEM DYNAMICS13
Figure 4.Stability maps A (left, chain disconnected) and B (right, braking case withσ=0).

### immediately that:
k
c
=0⇒
⎧
⎪
⎨
⎪
⎩
φ=0⇒a
0
=0
F
x0
=0⇒f=0
κ
0
=0⇒υ=1
(55)
In addition, ifF
z0

### =0then:

C
κ0
>0
χ=0
⇒

γ>0
λ>0
(56)

### The stability thresholds, Equations (47) and (49), yield:
λ
lim
1
=
a
1
−a
20
a
3
a
21
a
3
<0,λ
lim
2
=−
a
20
a
21
<0(57)
for every (positive)τ,μ,ζ,γ.Themodelinthiscaseisstableifλ>λ
lim
1
andλ>λ
lim
2
,
therefore if the chain is disconnected it is always stable. It may become unstable if
considering large (unrealistic, in this case) values of relaxation length as discussed in [7].
Figure4 (map A) showsλ
lim
1
(γ )andλ
lim
2
(γ )adopting the reference set of values
reported in Table2 forτ,μ,ζ,γ. In map A, and in all the following maps, the critical
speedV
crit
0
is inversely proportional toγ
lim
,accordingtoEquation(50).

### 3.3. Simplified transmission model
The equations of motion (1) are now considered withk
c
=0 and with the simplest
configuration of the chain transmission geometry, characterised byσ=0.
According to the simplifying assumptions leading to Equations (1), the reference set of
values reported in Tables1 and  2 is modified withl
p
=0,r
p
=r
c
=0.10 m andσ=0.
With the assumptionC
κ0
>0 yieldingγ>0(thecaseC
κ0
≤0 will be addressed in

### Section 3.6), it follows that, ifσ=0, then:
λ
lim
2
<λ
lim
3
<0(58)

14S. SORRENTINO AND L. LEONELLI
00.10.20.30.40.50.60.70.80.91
0
2
4
6
8
10
12
14
16
18
20
22
γ
λ
1lim
(
γ
)
α
0
= 0.3 rad
α
0
= 0.2 rad
α
0
= 0.1 rad
00.10.20.30.40.50.60.70.80.91
0
2
4
6
8
10
12
14
16
γ
λ
1lim
(
γ
)
ζ = 0.20
ζ = 0.40
ζ = ζ
ref
Figure 5.Stability maps for the braking case withσ=0: C (left, effect ofα
0
) and D (right, effect ofζ).

### andthemodelisstableif:
λ
lim
3
<λ<λ
lim
1
(59)
for every (positive)τ,μ,ζ,φ,γ,υ,fandξwithin the bounds reported in Table2.
In the case of braking (δ=1),λis always positive, hence the model is stable if
0<λ<λ
lim
1
.AsshowninFigure4 (map B), the stability thresholdsλ
lim
1
(γ )andχ
lim
1
(γ ),
drawn according to the updated reference set of values, may be reached only for very high
values ofλandχ.Forexample,withγ
ref
=0.15, the model would become unstable at
χ=9.39, which is not realistic.
Varying the other parameters within the bounds reported in Table2,itcanbeobserved
that onlyτandζare really effective in lowering the stability thresholds. In this case, the
influence ofμandφis not substantial, whileυ,fandξcanberegardedasnegligible(υ
∼
=
1,
fis two orders of magnitude smaller than any other parameter in the model, cutting down
also the effect ofξ). As shown in Figure5,bothincreasingτ(i.e.α
0
,mapC)ordecreasing
ζ(map D) lowers the stability threshold, but not enough to make possible the occurrence
of instability.
In the case of traction (δ=−1) and within the bounds reported in Table2,λis positive
only for very small values ofχ, its superior limit being very far fromλ
lim
1
.Forlargervalues
ofχ,λbecomes negative, but again the stability thresholdλ
lim
3
(constant with respect toγ,
basically a function of the angleα
0
)cannotbereached,asshowninFigure6(maps E and
F,thelatterdisplayingλ
lim
3
computed atγ
ref
as a function ofα
0
).
RecallingEquation(34),itshouldbepointedoutthatifl
p
=0andr
p
=r
c
, it follows

### σ=0. This condition may also occur if:
sinψ
0
=−
(r
c
−r
p
)
2
d
2
0
l
p
l
0
sinβ
0
(60)
In the latter case the results presented in this subsection are valid as well.

### 3.4. General transmission model: pinion centre on the swingarm line
The effect of varyingl
p
=0andr
p
=r
c
is first investigated whenβ
0
=0, i.e. when the
pinion centre is on the swingarm line. In this case Equation (36) is exact and Equation (25)

VEHICLE SYSTEM DYNAMICS15
00.10.20.30.40.50.60.70.80.91
−6
−4
−2
0
2
4
6
8
10
12
γ
λ
3lim
(
γ
)
λ
1lim
(
γ
)
λ
1
lim
λ
3
lim
567891011121314151617181920
−12
−11
−10
−9
−8
−7
−6
−5
−4
−3
−2
α
0
[°]
λ
3lim
(
γ
ref
)
Figure 6.Stability maps E (left, traction case withσ=0) and F (right,λ
lim
3
as a function ofα
0
).

### reads:
sinψ
0
=
δ(r
c
−r
p
)
l
sa
+l
p
(61)
As in Section2.3,ifγ>0 then the stability regions are delimited by Equation (59). Also
in this configuration and for the same reasons the influence ofυ,fandξis negligible.
In this section and in the following one, the stability maps are expressed in terms of
χ
lim
(γ )(giving a more direct connection with the slip characteristic function of the tyre).
Inthecaseofbraking(δ=1), ifr
c
>r
p
thenσis positive. Figure7 (map G) shows the effect
of varyingr
c
—r
p
(withl
p
=0) on the stability thresholdχ
lim
1
(γ )(r
p
=0.10 m⇒σ=0,
ψ
0
=0;r
p
=0.09 m⇒σ=0.04,ψ
0
=0.8
◦
;r
p
=0.08 m⇒σ=0.10,ψ
0
=1.8
◦
;r
p
=
0.06 m⇒σ=0.20,ψ
0
=3.5
◦
;r
p
=0.04 m⇒σ=0.30,ψ
0
=5.3
◦
).
Therefore increasingσ(i.e.ψ
0
) can reduce dramatically the stability margin. Notice
that, due to the monotonic behaviour of the stability thresholdχ
lim
1
(γ ),increasingthe
velocityV
0
(while keeping constant all the other parameters) can bring the model from
stability to instability.
Figure 7.Stability maps, braking case withσ>0, G (left, effect ofr
p
) and H (right, effect ofl
p
).

16S. SORRENTINO AND L. LEONELLI
Figure 8.Stability maps I (left, traction case withσ<0, effects ofα
0
andl
p
) and J (right, effect ofη,
braking case: solid line, traction case: dotted line).
Variations ofl
p
(withr
p
constant) are less effective in this respect, as shown in
Figure7 (map H); notice thatl
p
canbeassumedpositiveornegative,producingvari-
ations ofd
0
(l
p
=0.10 m⇒σ=0.26;l
p
=0.05 m⇒σ=0.28;l
p
=0m⇒σ=0.30;
l
p
=0.05 m⇒σ=0.33;l
p
=0.10 m⇒σ=0.36;ψ
0
spanning from 4.6
◦
to 6.3
◦
). Vari-
ations ofα
0
also have marginal influence, ifψ
0
isnottoosmall,likeforexamplein
map H.
A reduction of the stability margin can instead be observed with decreasing values of
μ,φ,orζ. Notice that variations of the stiffness parameterφaffect the stability threshold
only at relatively small values ofγ(within the reference range). Reducing the damping
coefficientc
s
(and thereforeζ) can reduce significantly the stability margin (a reduction of
c
s
also increasesγ, however normally not to a degree to compensate the effect ofζ).
In the case of traction (δ=1), ifr
c
>r
p
,thenσisnegative.Themodelisstableif
0<χ <χ
lim
3
, so the main influential parameters areτandσ.AsshowninFigure8
(map I), increasingα
0
reduces the stability margin (α
0
=0.20⇒σ=0.261;α
0
=0.25⇒
σ=0.264;α
0
=0.30⇒σ=0.268); the same effect can also be observed when reduc-
ingl
p
(l
p
=0⇒σ=0.301;l
p
=0.10⇒σ=0.356). However, in this case the stability
threshold cannot be reached with realistic values ofχ.
The effects of parameterηin both braking and traction conditions are highlighted
in Figure8 (map J), where the reference case is compared with the non-realistic condi-
tion in whichη=0. Braking reduces the stability margin and traction increases it, both
proportionally toγ.

### 3.5. General transmission model: pinion centre out of the swingarm line
The effect of varyingψ
0
is now investigated when the pinion centre is out of the swingarm
line, first assumingr
p
=r
c
(along withl
p
=0andβ
0
=0). Henceσis positive and
takes the same value in both braking and traction conditions, Equation (36) is exact, and

### Equation (25) reads:
sinψ
0
=
l
p
d
0
sinβ
0
(62)

VEHICLE SYSTEM DYNAMICS17
00.10.20.30.40.50.60.70.80.91
0
1
2
3
4
5
6
γ
χ
1lim
(
γ
)
β
0
= 0.20 rad
β
0
= β
0ref
β
0
= 1.20 rad
00.10.20.30.40.50.60.70.80.91
0
1
2
3
4
5
6
7
8
9
γ
χ
1lim
(
γ
)
δ = 1
δ = –1
Figure 9.Stability maps K (left, general braking case, effect ofβ
0
) and L (right, general case, comparison
between traction and braking conditions).
The effect of varyingβ
0
in braking conditions is shown in Figure9 (map K) assuming
r
p
=r
c
=0.10 m andl
p
=0.10 m (values ofβ
0
: 0.20 rad, 0.40 rad, 0.60 rad, 0.80 rad,
1.00 rad, 1.20 rad;σspanning from 0.09 to 0.44, andψ
0
from 1.5
◦
to 7.7
◦
). Increasing
β
0
(henceψ
0
andσ) reduces the stability margin, except for very small values ofγ.With
negativeβ
0
(r
p
=r
c
) in braking conditions the model would be at least stable as in the case
β
0
=0andr
p
=r
c
(null, or negativeψ
0
).
The effect of varyingβ
0
in traction conditions is shown in Figure9 (map L), in compar-
ison with braking conditions (β
0
=0.40 rad,r
p
=r
c
=0.10 m,l
p
=0.10 m). Also in this
case the model is stable if 0≤χ<χ
lim
1
, but the stability margin is larger than in braking
conditions.
In the general case (r
p
=r
c
,l
p
=0,β
0
=0) all the factors leading to instability are
present. The variation ofχ
lim
1
(γ
ref
) as a function ofα
0
is represented in Figure10 (map
M), showing the range ofα
0
for which the model is unstable. Starting from the reference
point (unstable, withγ=0.15,α
0
=11.46
◦
,σ=0.43,ψ
0
=7.6
◦
), the map exhibits two
opposite trends, since reducingα
0
has a stabilising effect as well as increasing it (the second
one due to the reduction ofβ
0
, and therefore ofψ
0
andσ).
Figure 10.StabilitymapsM(left,χ
lim
1
asafunctionofα
0
)andN(right,caseofγ<0,beyondmaximum
F
x0
).

18S. SORRENTINO AND L. LEONELLI

### 3.6. Maximum longitudinal slip force and beyond
When the longitudinal slip forceF
x0
reaches its maximum value, thenC
κ0
=0andγ=0.
Equation (54) becomes exact, thereforeδ=1yieldsλ>0, andδ=−1yieldsλ<0.
According to Equation (59), the model is stable ifλ
lim
3
<λ<λ
lim
1
.
For example, adopting the reference values of Table2,δ=1andγ=0yield
λ
lim
1
=0.367 andχ
lim
1
=0.416; ifλ=0.75 andχ=0.85, then the behaviour would be
unstable. On the other hand, withδ=−1andγ=0thesamevaluesyieldλ
lim
3
=3.414,
λ
lim
1
=0.086 andχ
lim
1
=0.098; hence forλ=0.75 andχ=0.85 the behaviour would be
stable.
The same analysis holds also in the case of travelling with a locked wheel, the only differ-
ence being a reduction off. In between the condition of maximumF
x0
and that of travelling
with locked wheel,γtakes (small) negative values. Figure10 (map N) shows the behaviour
ofχ
lim
1
(γ )according to the reference values of Table2. In braking conditions the stability
threshold decreases untilχ
lim
1
(γ )=0, and from this point onwards the model would be
always unstable. In traction conditions the behaviour is different: ifχ<χ
lim
3
, the model
is always stable as long asχ
lim
1
(γ ) <0, and unstable behaviour may occur only from the
pointχ
lim
1
(γ )=0onwards.

### 3.7. Concluding remarks
The most important parameters for the stability of the model areγandχ, characterising
the manoeuvre as a function of the velocity and of the working point on the characteristic
slip function of the tyreF
x0
(κ
0
,F
z0
).
Among the other parameters, the most relevant for controlling the stability margin is
σ: a function of the geometry at the considered equilibrium point, involving both the
swingarm pitch angleα
0
and the relative angleψ
0
of the chain taut segment.
A reduction of the mass, damping and stiffness parameters (μ,ζandφ) usually
contribute, sometimes significantly, in lowering the stability margins. The remaining
parameters (υ,fandξ) in most cases show negligible influence.
Asforrealmotorcycles,differentbehaviourswithrespecttothestabilityhavebeen
detected when comparing braking and traction conditions, due to both different values
of the angleψ
0
and different working points on the characteristic slip function of the tyre
(caused by longitudinal load transfers).
Finally, it should be remarked that the effectiveness of these results also depends on the
precision of the parameter estimates. In fact, some of the crucial parameters involved (for
exampleχ) are difficult to accurately estimate in operative conditions.

### 4. Analysis of the source of instability
The driving mechanism generating a general self-excited vibration can often be identified

### amongthefollowingcases[10]:
•connections with friction;
•decreasing damping characteristics;
•fluctuating normal forces;

VEHICLE SYSTEM DYNAMICS19
•geometrical effects;
•non-conservative restoring forces, yielding asymmetrical stiffness matrices.
As a matter of fact, a combination of two or more of these basic mechanisms can generate
instability as well, as in the present case.

### 4.1. The unstable mode
Eigenvalue analysis shows that the switching mechanism to instability takes place when
acomplexeigenvaluecrossestheimaginaryaxis[10]. Figure11, left, presents a (partial)
root locus for the two modes (on the right side the eigenvalue of the mode which can
become unstable), computed varyingγin the whole range of interest for the present study,
according to the reference set of parameters in Table2.
In Figure11, right, the frequency of the mode at the stability threshold is represented
as a function ofγ, according to Equation (52): notice that the values are in the frequency
range of motorcycle chatter.

### 4.2. Energy balance analysis
The switching mechanism to instability controls the energy flow in the model. If the flow
from the source to the oscillator is larger than the dissipated energy during one cycle,
thevibrationamplitudeincreases.Ifitissmaller,theamplitudedecreases.Atthestability
threshold, the energy input balances the dissipated energy during each period [10].
In the case under analysis, this can be shown recalling the equations of motion (39),

### now rewritten in the form:
G=

m0
0J

̈w+

c
s
0
00

̇w+

k
11
k
12
k
21
k
22

w−F=0with
w=

z
θ

,F=

τ
−r
0

F
x
+

ξ
r
0

δF
x0
r
−1
0
z

k
11
=k
s
+k
z
+σ
2
k
c
r
2
c
r
−2
0
,k
12
=δσk
c
r
2
c
r
−1
0
k
21
=δσk
c
r
2
c
r
−1
0
,k
22
=k
c
r
2
c
(63)
Figure 11.Root locus ofu(γ ), for different values ofχwith reference parameters (left), and natural
frequency of the mode at the limit of stability as a function ofγ(right).

20S. SORRENTINO AND L. LEONELLI
Atthelimitofstabilityandafteratransient,thesystem’sfreeresponseconvergestoa

### harmonic oscillation of periodT:
T=
2π
ω
lim
(64)

### Therefore, the energy balance over a period can be expressed as:
E=E
kin
+E
pot
+E
dis
=

T
0
(G· ̇w)dt=0(65)
whereE
kin
is the kinetic energy balance andE
pot
is the potential energy balance related
to the stiffness matrix in Equations (63).
SinceatthelimitofstabilitybothE
kin
andE
pot
are null, from Equations (65) it

### follows that:
E
dis
=

T
0
P(t)
lim
dt
=

T
0
[c
s
̇
z
2
−F
x
(τ
̇
z−r
0
̇
θ)−δF
x0
r
−1
0
z(ξ
̇
z+r
0
̇
θ)]
lim
dt=0(66)
where the term dependent onF
x0
with the adopted parameter values results to be numer-
ically negligible. It is concluded that, at the stability threshold, the internally dissipated
energy over one period (by the damperc
s
) is balanced by the energy drawn by the slip
force. Figure12 shows the oscillating power functionP(t),clearlyyieldingE
dis
=0ifthe
model is at the stability threshold.

### 4.3. The driving mechanism
The key factor for understanding the origin of this self-excited vibration can be recog-
nised in the phase-lag (say) between the non-stationary components of the slipκand
longitudinal ground forceF
x
.
Comparing the constitutive equations (14) and (15), it is clear that ifχ=0, thenκand
F
x
arein–phase(=0).Intheseconditionsifγ>0themodelisalwaysstable.Itcanalso
be observed that the value ofraises by increasingχ.Atχ=χ
lim
1
the stability threshold
is reached, hence the model becomes unstable for a certain phase-lag.
As an example, in Figure13, three free responses represented in the formF
x
(κ)in the
κ–F
x
phase plane are computed betweent=0.15 s andt=0.50 s for different values ofχ,

### using the reference set of values in Table2 andthefollowinginitialconditions:
z(0)=0,
̇
z(0)=0.05 m s
−1
,θ(0)=0,
̇
θ(0)=−0.1 rad s
−1
(67)
According to the stability map, the stability threshold occurs atγ
ref
=0.15 and
χ
lim
1

### =0.83977. The orientation of the phase diagramF
x
(κ)with respect to the reference
system provides a measure of the phase-lagbetweenκandF
x
.
Ifχ=0and=0, then the phase diagram in Figure13 would reduce to a segment
centred in the origin of the axes and extended in the first and third quadrants (with positive
slope), as shown in Figure14, left. In the opposite (virtual) case,κandF
x
would be in
counter-phase (=−π), henceF
x
(κ)would be represented by a segment centred in the

VEHICLE SYSTEM DYNAMICS21
Figure 12.Power functionP(t).
−3−2−10123
x 10
−3
−25
−20
−15
−10
−5
0
5
10
15
20
25
κ
F
x
[N]
χ = 0.84, limit
χ = 0.88, unstable
χ = 0.80, stable
Figure 13.Characteristic functionF
x
(κ)in theκ–F
x
phase plane, for different values ofχ.

22S. SORRENTINO AND L. LEONELLI
Figure 14.Phase diagramsF
x
(κ)at the stability threshold, for different values ofγ.
origin, but extended in the second and fourth quadrants (with negative slope), as shown in
Figure14, right. Therefore in the latter case, the driving mechanism leading to instability
would be simply given by a constitutive equationF
x

### =c·κ,withc<0. The actual case
isintermediatebetweenthesetwoextremesinwhichtheconstitutiveequationisdefined
by a constant damping coefficient, either positive or negative (compare the stability map
NinFigure10,caseδ=1, with the phase diagrams in Figure14 for different values of
γ). In fact, the stability threshold is reached at an intermediate phase-lag,whereis
a function of the equilibrium point considered. The phase lagat the stability limit is
shown in Figure15 as a function ofγ: it can be observed that increasingγleads towards
the counter-phase condition already highlighted in Figure14,right.
−0.100.10.20.30.40.50.60.70.80.911
−180
−150
−120
−90
−60
−30
0
γ
Θ
[°]
Figure 15.Phase lagbetweenκandF
x
, as a function ofγ.

VEHICLE SYSTEM DYNAMICS23
The vertical and longitudinal fluctuating forcesF
x
andF
z

### interact in two different ways:
first, through the partial derivative ofF
x0
(κ
0
,F
z0
)with respect toF
z0
(i.e.χ), accord-
ing to Equations (4), (21) and (22); second, as a consequence of a geometrical coupling
introduced in the displacementzby the tilted swingarm pitch angleα
0
.
Therefore, it can be stated that the key role in the switching mechanism to instability is
played by parameterχ. It gives rise to a non–conservative restoring force and to an asym-
metric stiffness matrix in Equations (42), which potentially raises the phase–lagup to a
critical value.

### 5. Conclusions
In this study a simplified model has been presented and analysed for explaining the self-
excited vibration which has been observed when simulating straight running braking
manoeuvres with multibody motorcycle models. The stability of the model has been stud-
ied in equilibrium configurations via eigenvalue analysis, highlighting the sensitivity with
respect to all the model governing parameters by means of analytically determined maps.
The key role in the switching mechanism to instability is played by the nonlinear char-
acteristic slip function of the tyreF
x0
(κ
0
,F
z0
), and more precisely by its partial derivative
(χ) with respect to the stationary component of the vertical ground force (F
z0
). It can
increase the phase-lag between the non-stationary components of the slip (κ)andlongi-
tudinal ground force (F
x
) up to a critical value, giving rise to a non-conservative restoring
force and to an asymmetric stiffness matrix. For a certain value ofχthe stability threshold
is reached: in these conditions the energy internally dissipated by the damper (c
s
)overone
period is balanced by the energy drawn by the longitudinal ground force (F
x
).
Among the other parameters, two are the most relevant for controlling the stability
margins of the model: the first one (γ) characterising the manoeuvre in terms of veloc-
ity and slip stiffness, the second one (σ) characterising the geometry of the transmission,
essentially as a function of the angle between the chain force and the swingarm line (ψ
0
).
In addition, variations of the mass, damping and stiffness parameters can contribute,
sometimes significantly, in shifting the stability thresholds.
As in real motorcycles, different behaviours with respect to stability have been detected
when comparing braking and traction conditions, due to both different values of the angle
ψ
0
and different working points on characteristic slip function of the tyre, caused by
longitudinal load transfers.
Future work will be devoted to the extension of this stability analysis to transients (con-
sideringtheproblemintherelevantcaseoftime-varyingparameters)andtothesimulation
of the phenomenon with multibody models of a complete motorcycle, considering both
in-plane and out-of-plane dynamics.
Disclosure statement
No potential conflict of interest was reported by the authors.

### References
[1] TezukaY,KokubuS,ShiomiY,etal.Vibrationcharacteristicsanalysisinvehiclebodyvertical
plane of motorcycle during turning. Honda R&D Tech Rev.2004;16(1):219–224.

24S. SORRENTINO AND L. LEONELLI
[2] Sharp RS, Watanabe Y. Chatter vibrations of high-performance motorcycles. Veh Syst Dyn.
2013;51:393–404.
[3] SharpRS,GilesCG.Motorcyclefrontwheelpatterinheavybraking.Proceedings,8thIAVSD
Symposium; Cambridge MA, USA, Aug 1983. p. 578–590.
[4] Cossalter V, Lot R, Massaro M. The chattering of racing motorcycles. Veh Syst Dyn.
2008;46(4):339–353.
[5] Cossalter V, Lot R, Massaro M. The significance of powertrain characteristics on the chatter of
racing motorcycles. Proceedings, ASME ESDA 2012; Nantes, France; Jul 2012.
[6] Pacejka HB. Some recent investigations into dynamics and frictional behavior of pneumatic
tyres.In:HaysHF,BrowneAL,editors.Thephysicsoftyretraction.Theoryandexperiment.
New York: Springer-Verlag; 1974. p. 257–279.
[7] LeonelliL,MancinelliN,SorrentinoS.Astudyofmotorcyclechattervibrationwithmultibody
models of increasing complexity. Proceedings, 24th IAVSD Symposium; Graz, Austria; Aug
2015.
[8] Pacejka HB. Tyre and vehicle dynamics. Oxford: Butterworth-Heinemann;2002.
[9] Hurwitz A. Über die Bedingungen, unter welchen eine Gleichung nur Wurzeln mit negativen
reellenTheilenbesitzt(Ontheconditionsunderwhichanequationhasonlyrootswithnegative
realparts).MathAnn.1895;46(2):273–284.
[10] Kröger M, Neubauer M, Popp K. Experimental investigation on the avoidance of self-excited
vibrations. Philos Trans R Soc A.2008;366:785–810.
