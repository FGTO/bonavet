# Devices behind a provider boundary; no Google Home integration

Google Home offers no public web API that a third-party web app can use to control lights or plugs (its developer APIs target native Android/iOS apps; the Nest SDM API covers only thermostats and cameras). BoNavet therefore talks to Devices only through a provider boundary. v1 ships a demo provider with fake Devices; Home Assistant is the intended first real provider. Don't add a Google Home provider without first checking that this limitation has changed.
