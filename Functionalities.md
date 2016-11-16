======Dashboard functionalities======
Events captured from the interaction tracking tool can be analysed using this tool.
The list of captured events is available in [[wp3:capturedevents|this document]]. This dashboard provides the means to obtain insight into the interaction with the MOVING platform.
Hypothesis about users' interaction can be tested, and workflows can be extracted.


===== Event sequence extraction for hypothesis testing =====
The dashboard will provide a tool to design and extract sequences of the captured events.
Analysis of these sequences allows designers to test hypothesis regarding users' interaction.
For example, the designer might believe users scroll less over time. If so, information outside the initial view of the page would remain obscured.
Sequences of scroll interaction can be extracted, and their occurrences over time analysed. The frequency of these sequences, as well as various attributes (such as distance and speed, in the case of the mentioned example) can be analysed.

A specific grammar will be created to support the design of sequences without the need of coding knowledge. 
For example, for the previously mentioned example, the designer would want to extract and analyse all sequences of scroll interaction. To do that, a period needs to be defined, so scroll interaction events happening at various times can be aggregated as part of the same sequence.

    Find SCROLL events occurring WITHIN 10 seconds.



Events or sequences of events taking place in a particular order can also be designed.


    Find SCROLL events occurring WITHIN 10 seconds.
    FOLLOWED by CLICK


Specifications of these sequences are also possible, for example adding detail to the extracted information


    Find SCROLL events occurring WITHIN 10 seconds.
    FOLLOWED by CLICK on element of CLASS:BUTTON and TEXTCONTENT:SEARCH



Hypothesis defined in the WP1 will be tested in this manner.
This way knowledge acquisition through interaction will be explored.

== Todos for this section ==
  * Extend applications and contribution to the project.
  * Explain how this hypothesis testing will enable the exploration of knowledge acquisition process in data-intensive environments
  * Explain clearly how these events complement the raw low-level events captured from the users' interaction.


=====Workflow definition=====
A series of use cases will guide the design of the MOVING platform.
However, the real use of the platform might differ from the designers' expectations.
Users' workflows will be extracted from the captured interaction data, to be compared to the initial designs.
A combination of visual exploration and sequence mining will be combined to support the exploration of the workflows.

The designer will be able to design the sequences that conform the workflow. These sequences can be conformed of both high-level events, identified from the MOVING platform (such as relevant interactions with buttons), and event sequences extracted following the methodology described in the previous section.

Extracted sequences from the users interaction can then be compared to the projected workflow in a visual manner.
In the following example, a simple search task workflow has been designed. Outliers deviating from the projected interaction can be easily identified. 

{{:wp3:dashboardfunctionalities.png?400|Workflow diagram showing outliers for a mock search functionality}}

Additionally, sequence mining techniques will be employed, to identify outliers from completely different workflows.

Once these workflows are defined, they can be detected in real time during users' interaction. This contributes to validation of the use cases, providing the means to obtain remote feedback. 

== Todos for this section ==
  * Explain graph
  * Detail the pattern mining
  * Detail the live detection of workflows.
