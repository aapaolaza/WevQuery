echo "Loading shell variables" at $(timestamp)

##Defining variables
#SERVERIP/DATABASENAME
mongoPath="localhost/ucivitdb"
mongoUser="USERNAME"
mongoPass="PASSWORD"
mongoAuthenticateDB="admin"
mongoDB="ucivitdb"

##web site to be analysed, determined by its "sd" value. 10002 is kupb, 10006 is CS
websiteId="10006";