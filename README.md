# WevQuery

Testing Hypotheses about  Web Interaction Patterns.

## Deployment

1. Install npm and nodejs
1. Run `npm install`
1. Run `npm start`
1. To test if it's running, access <http://localhost:2929>, a message should appear.

## Query Creation

Accessing <http://localhost:2929/WebInterface/queryCreation.html> in a Web browser shows the query creation interface.
This interactive Web application supports the design of the queries, allowing designers to drag and drop the event elements, and automatically showing the available values for the attributes of the events. The queries are composed of a sequence of ordered events and each event in the sequence can match one or more types of interaction events. For example, a particular event in the sequence can be set to match either a `mousedown` (describes the action of clicking the mouse) or a `mousewheel` (describes the interaction with the scroll wheel of the mouse). The graphical interface consists of several modules including an event palette, a widget to define sequences and components to establish the temporal relationships between events. The analysis tab can be accessed clicking on the toggle under the WevQuery icon.

## The Event Palette

This widget displays the user events that can be selected when defining a query. When the *plus* sign in the `Event Example` box (under the Event Palette header) is pressed, the event template creation dialogue is shown. One or many event types can be selected. The number of times an event type needs to be matched can be set in the `occurrence` field.

## Designing Patterns of Event Sequences

Events created in the Event Palette can be dragged and dropped into the Event Sequence Pattern Design area (bottom panel in the interface), using the *move* icon at the top-right of the element that represents an event. The position of events in the list determines the order of the sequence which is conveyed by a number located next to the mentioned *move* icon. The resulting query consists of a sequence of events WevQuery uses to look for patterns that match the sequence. Events can also be discarded clicking on the *bin* icon located at the bottom-right corner of each event.

### Defining Temporal Constraints

The addition of temporal constraints allows designers to set time intervals between matched events. If not specified, the query will ignore the time elapsed between events. When clicking on the `Add a new Temporal Constraint` button, a dialogue pops up, allowing designers to establish the following temporal aspects:

* **Relation** determines if the temporal distance between selected events has to be under (within) or above (separated by) the indicated threshold.
* **Events** allows the designer to select the two events affected by the temporal constraint. When one of the buttons is pressed, the dialogue temporarily disappears so that the user can select the events in the Event Sequence Pattern Design area (bottom panel).
* **Duration** and **Unit** determine the temporal distance, and the unit of time that designers wish to establish.

Once temporal constraints are defined, the length of the bar that conveys the scope of temporal constraints can be dragged and modified.


## Analysis

Accessing <http://localhost:2929/WebInterface/analysis.html> in a Web browser shows the analysis interface.
This interface is under construction, and instructions will come soon.

## Publications

## Acknowledgements

This work was supported by the EU's Horizon 2020 research and innovation programme under grant agreement H2020-693092 MOVING (\url{http://moving-project.eu}) and the Engineering and Physical Sciences Research Council [EP/I028099/1].