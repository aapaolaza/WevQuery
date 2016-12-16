var jsonQuery =
{
	"eql": {
		"event": [{
			"eventList": "mousedown",
			"_id": "x1",
			"_pre": "null"
		}, {
			"eventList": "mouseup",
			"_id": "x2",
			"_pre": "x1"
		}],
		"temporalconstraintList": {
			"temporalconstraint": {
				"eventref": [{
					"_id": "x1"
				}, {
					"_id": "x2"
				}],
				"_type": "within",
				"_value": "10",
				"_unit": "sec"
			}
		}
	}
}