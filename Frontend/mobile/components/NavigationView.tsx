import React from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native'
import GooglePlacesTextInput from 'react-native-google-places-textinput'

const NavigationView = () => {
  const [places, setPlaces] = React.useState();

  const  handlePlaceSelect = async (place: any) => {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': 'AIzaSyDkc3WA8HoqkoHEWogkZhSAO_2Du6wo-x4',
              'X-Goog-FieldMask': 'places.displayName,places.name,places.googleMapsUri'
            },
            body: JSON.stringify({
                includedTypes: ["parking"],
                maxResultCount: 5,
                rankPreference: "DISTANCE",
                locationRestriction: {
                  circle: {
                    center: {
                      latitude: place.details.location.latitude,
                      longitude: place.details.location.longitude
                    },
                    radius: 1000
                  }
                }
              }
            ),
          });
        const duration = await response.json();
        setPlaces(duration.places);
        console.log(duration.places);
  };

  const NavigationListView = (places: [any]) => {
    return (
    <View>
      <FlatList
        data={places}
        renderItem={({ item }) => (
          <View>
            <Text style={styles.innerText}>{item.displayName.text}</Text>
          </View>
        )}
        keyExtractor={(item) => item.googleMapsUri}
      >
      </FlatList>

    </View>
  )}

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    baseText: {
      fontWeight: 'bold',
    },
    innerText: {
      color: 'red',
    },
  });


  return (
    <View>
        <GooglePlacesTextInput 
        apiKey="AIzaSyDkc3WA8HoqkoHEWogkZhSAO_2Du6wo-x4"//TODO
        placeHolderText="Search for a location"
        fetchDetails={true}
        detailsFields={['formattedAddress', 'location']}
        locationRestriction={{
          rectangle: {
            low: { latitude: 40.39286, longitude: -86.954622},
            high: { latitude: 40.466874, longitude: -86.871755 }
          }
        }}
        onPlaceSelect={ handlePlaceSelect }  >

        </GooglePlacesTextInput>   
    </View>
  )
}

export default NavigationView