# WevQuery

## TERMS OF USE

Testing Hypotheses about  Web Interaction Patterns. If you make use or refer to this work, please cite our [paper](https://dl.acm.org/citation.cfm?id=3095806) <https://dl.acm.org/citation.cfm?id=3095806>.

### Cite as:

**Inline**
```
Aitor Apaolaza and Markel Vigo. 2017.
WevQuery: Testing Hypotheses about Web Interaction Patterns. 
Proc. ACM Hum.-Comput. Interact. 1, EICS, Article 4 (June 2017), 17 pages. 
DOI: https://doi.org/10.1145/3095806
```

<details>
 <summary><b>BibTeX</b> <a href="cite/WevQuery.bib">BibTex file</a></summary>
 <pre>
@article{Apaolaza:2017:WTH:3120954.3095806,
 author = {Apaolaza, Aitor and Vigo, Markel},
 title = {WevQuery: Testing Hypotheses About Web Interaction Patterns},
 journal = {Proc. ACM Hum.-Comput. Interact.},
 issue_date = {June 2017},
 volume = {1},
 number = {EICS},
 month = jun,
 year = {2017},
 issn = {2573-0142},
 pages = {4:1--4:17},
 articleno = {4},
 numpages = {17},
 url = {http://doi.acm.org/10.1145/3095806},
 doi = {10.1145/3095806},
 acmid = {3095806},
 publisher = {ACM},
 address = {New York, NY, USA},
 keywords = {a/b testing, hypothesis testing, usability, user interface evaluation, web},
}
</pre>
</details>


<details>
 <summary><b>EndNote</b> <a href="cite/WevQuery.enw">EndNote file</a></summary>
 <pre>
%0 Journal Article
%1 3095806
%A Aitor Apaolaza
%A Markel Vigo 
%T WevQuery: Testing Hypotheses about Web Interaction Patterns
%J Proc. ACM Hum.-Comput. Interact.
%@ 2573-0142
%V 1
%N EICS
%P 1-17
%D 2017
%R 10.1145/3095806
%I ACM
</pre>
</details>


## Database configuration

WevQuery uses MongoDB to access the interaction data.
1. Install MongoDB
1. In the folder mongoDAO, there is a file called `dbAccessDataTemplate.js`. Copy or rename that file to `dbAccessData.js`, and, if necessary, modify it with the credentials to your MongoDB installation. If no authentication is required, there is no need to modify this file.
1. In the root folder, copy or rename the file `userCredentialsTemplate.js` to `userCredentials.js`. This file enables basic HTTP authentication. You just need to add another line to the userList with the desired user and password. By default the HTTP authentication is off.

## Data sample
An anonymised dataset is available so the tool can be tested right away. However, the download and restoration of this sample dataset needs plenty of space (at least around 20 GB) and time (the restoration of the database takes some time, up to 30 minutes depending on the machine).
<http://www.cs.man.ac.uk/~apaolaza/wevquery/ucivitdb.zip>
This data has been captured using <https://github.com/aapaolaza/UCIVIT-WebIntCap>.
1. Download the data from <http://www.cs.man.ac.uk/~apaolaza/wevquery/ucivitdb.zip>
1. Unzip the downloaded file.
1. Open a command line where the uncompressed folder is located, and execute the following command: `mongorestore ucivitdb/`. If credentials are needed to access your database, you will have to run the command in this manner: `mongorestore -u USER -p "PASSWORD" --authenticationDatabase admin ucivitdb/`. More information about restoring a database in mongoDB can be found here <https://docs.mongodb.com/manual/reference/program/mongorestore/>.

## Deployment

1. Install npm and nodejs. If you are using linux, please avoid using the standard repositories, as they commonly host old versions of nodejs. Refer to <https://nodejs.org/en/download/package-manager/> to install updated versions.
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

This work was supported by the EU's Horizon 2020 research and innovation programme under grant agreement H2020-693092 MOVING (<http://moving-project.eu>) and the Engineering and Physical Sciences Research Council [EP/I028099/1].
