###To run, use the following
# sh queryXML.sh filename.xml
#The name of the file will be added to the MapReduceConstants.js file, and the MapReduce script will be started

echo "Starting xml query"

#If no arguments are set
if [ $# -eq 0 ]
  then
    ##Default behaviour should be showing the message, and exitting afterwards
    ##echo "No arguments supplied"
    ##exit 1
    xmlFilename="eql.xml"
fi
echo "Processing xml: " $xmlFilename

##Transform the XML into JSON
##https://github.com/martinblech/xmltodict
##pip install xmltodict
#Store XML into variable
xmlString=$(<$xmlFilename)
##xmlString=`cat $xmlFilename`

echo $xmlString
python -c 'xmltodict.parse("""$xmlString""")'
python -c "json.dumps(xmltodict.parse('"$xmlString"'))"


#If the vairable already exists, delete it 
sed -i '/var xmlFilename.*/d' "MapReduceConstants.js"
#Append new value of variable to the file
echo "var xmlFilename = '"$xmlFilename"';" >> "MapReduceConstants.js"

#mongo XMLtoMongoDB.js