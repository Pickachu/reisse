# Todos
# - Predict content absorpion (perhaps with routine? perhaps, phisiology?)
# ➜ TODO think how to predict content absorpion
#
#  - Figure out why youtube videos are outperforming habitual sleep all the time
#    - Evidences
#     - Videos win in simplicity and lose in motivation (at 23 o'clock)
#     - Videos win in routine (at 23 o'clock) because:
#      - activity type uses a probability map based on timestamp instead of timeslice
#    - Features to explore to make sleep habit more powerful:
#     - ✖ Chance (see below)
#     - ✖ Routine: Activity Type (see below)
#     - ✖ Routine: Frequency (see below)
#     - Sensation: Sleepiness
#     - Location
#
#  - (ON HOLD) Figure out what i must do to use activity type as a predictor
#    ➜ routine activity type classifier can be used inside simplicity classifier to learn activity type daytime and thereby diferentiate browsing from working activities
#      - Audite activity type (routine) classification of habitual sleep
#        - the problem: createProbabilityMap receives a timestamp but activityType receives a timeslice
#  - Figure out why youtube videos are outperforming asana tasks all the time
#    - It is because asana tasks have anticipation associated with them

# Tested hypothesis
# ✖ `Use chance feature to diferentiate habitual sleep and youtube videos` (it is more likely for me to sleep given the night context)
#   - The next step in improving the chance predictor is adding the trigger component (probably by generate an encoding from context and passing as input)
# ✖ `Use routine activity-type feature to diferentiate habitual sleep and youtube videos` (it is more common to have an activity type of sleep at night than to see videos)
#   - To improve activity type prediction I need to change it's input to occurrence specie instead of activity type, because i can't generate timeslices from 'open' occurrences yet. Also when species are ready i will be able to guessing occurrence start time, duration and end time based on specie.
# ✖ `Use routine frequency feature to diferentiate habitual sleep and youtube videos` (it is more frequent to have an sleep at night than to see videos)
#   - Currently frequency predictor predicts only weekly frequency, and youtube videos are more frequent

# Backlog
# IDEA use an encoder decoder architeture, consider all data factors, generate an econding for the day and then a decoding (seq2seq)
# TODO Fix chance predictor: By adding context to its learning as the trigger of behavior fogg model?
# TODO do not let youtube videos override habitual sleep: increase brain cycles cost according sleepiness, decrease video sensation motivation according sleepiness, think one more option
# TODO do not use video title as occurrence title
# TODO create an event type that is called 'Aural Event' (perhaps buff?) or something like that that is for events that lasts more than one day (like Alboomização)

# Thinking pool
Current conclusion:

  - To implement content absorpion predictor i must decide if it will be responsibility area or activity type that will influence anticipation of content absorption.
    - to use responsibility area i need to map rescue time imported video documents to some responsibility area. I need to use data from my google activity or youtube api.
    - to use activity type what must i do? routine frequency estimator must be created
 > There is no need to use motivation to predict behavior as of yet, because:
   > i don't know if motivation will be a factor in dicerning between pursuing predicted ocurrences and suggested occurrences
   > for now i'm implemeting the content absorption predictor to see what happens
   > and then continuous synchronization system


Implemented Predictors:

  - Time of the day prediction

  - Weekly amount prediction is OK (when there is no previous data)
  - Weekly frequency prediction is OK (when there is no previous data)

Subjective motivators and motivations detected by Heitor:

  Motivos do heitor para assistir videos
  • não estou me sentindo competente o suficiente
  • quero me tornar mais competente

  Motivadores?
  • sensação de ter insights ao assistir
  • sensação antecipada de se tornar mais competente

Involved Human Strengths

  Uso as forças curiosidade e love of learning para me tornar mais competente

  > Continue from here:
  Which sensations, and anticipations are in the realm of love of learning? Continue associating love of learning and fogg model:

  - The sensation of competence and efficacy is the experience of love of learning


# Later
# É possível relacionar uma força de carater com motivação (atual, passada e futura) de um indivíduo para executar um comportamento?

## Definição de força de carater:

> Character strengths are the psychological ingredients — processes or mechanisms — that define the virtues.
> Said another way, they are distinguishable routes to displaying one or another of the virtues.


## Testando Love of Learning:

# Definition 1: general individual difference
# Definition 2: a universal but individually varying predisposition to engage particular content (e.g., Latin, videogames, music) or well-developed individual interest (Renninger, 1990, 2000).


### Conceptual dimensions of some constructs: (how do conceptual dimensions of some constructs of love of learning relates to motivation?)

Rather than list all measures that may include some items that reflect love of learning, some examples of measures are identified here in terms of the theoretical traditions in which they have emerged

## Measure: Motivational orientation
Intrinsinc: indicates high love of learning,
• provides challenge
• satisfies curiosity
• creates interest
• creates enjoyment
• I enjoy tackling problems that are completely new to me
• The intrinsic motivation scale includes two subscales, enjoyment and challenge
• intrinsic motives to know
• intrinsic motives to accomplish things
• intrinsic motives to experience stimulation

Extrinsic: high or low levels of extrinsic motives does not reflect any possesion of love of learning

## Measure: Competence

These measures tend to reflect several kinds of competence-related dimensions, including perceptions of one’s capacities and abilities (Bandura, 1986; Marsh, Craven, & Debus, 1991); achievement motivation, or the importance a person attaches to achieving competence in general or specific to a domain (Helmreich & Spence, 1978; Jackson, 1974); the meaning of achieving (or failing to achieve) competence for self-worth (Harter 1998); and the kind of achievement goals a person adopts in a particular learning context (Butler, 1987; Dweck, 1986; Harackiewicz, Barron, Carter, Tauer, & Elliot, 2000; Midgley et al., 1998; Nicholls, 1984). To experience love of learning, researchers studying competence suggest, people must feel (or expect to feel) some sense of competence and efficacy in the learning process; that is, they must feel that they are mastering a skill, filling in the gaps in their knowledge, and so on.


## Measure: Value


## Measure: Well-developed interest.
Well-developed individual interest is characterized by a person’s ongoing and ever deepening cognitive and affective relation with particular content; as such it mirrors the more general strength, love of learning




### Processes: (how do processes of love of learning relates to motivation?)


### Mechanisms: (how do mechanisms of love of learning relates to motivation?)


- Check situational themes that relates love of learning on the strengths finder

# DONE

## TODO display behavior duration by day graph correctly
## TODO list some love of learning processes, constructs and mechanisms
