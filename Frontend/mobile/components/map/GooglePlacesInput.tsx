import { Alert, Linking, Platform } from 'react-native';
import GooglePlacesTextInput from 'react-native-google-places-textinput';
import { getGoogleMapsApiKey } from '../../config/env';

const StyledGooglePlacesTextInput = () => {
  const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
  const  handlePlaceSelect = async (place: any) => {
    console.log("here")
    console.log(place);
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
              'X-Goog-FieldMask': 'routes.duration'
            },
            body: JSON.stringify({
                origin: {
                    location: {
                        latLng: {
                            latitude: 40.43318472429998,
                            longitude: -86.92189194353148
                        }
                    }
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: place.details.location.latitude,
                            longitude: place.details.location.longitude
                        }
                    }
                },
                travelMode: "DRIVE",
            }
            ),
          });
    const duration = await response.json();
    const secsString = duration.routes[0].duration;
    const secs = secsString.slice(0, -1); 
    const eta = (Math.ceil(secs / 60));
    const etaString = ("Your ETA is: " + String(eta) + " minutes");
    const url = Platform.select({
      ios: `http://maps.apple.com/?saddr=40.428604085531404+-86.91934994154656&daddr=${place.details.location.latitude},${place.details.location.longitude}`,
      //android: `geo:0,0?q=${fullAddress}`,
    })
    createTwoButtonAlert(place, etaString, url);

  };
  const createTwoButtonAlert = (place: any, eta: string, url: any) =>
    Alert.alert(place.details.displayName.text, eta, [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {text: 'Directions', onPress: () => Linking.openURL(url)},
    ]);

  const customStyles = {
    container: {
      marginHorizontal: 16,
      marginVertical: 8,
    },
    input: {
      backgroundColor: '#fff',
      borderColor: '#ccc',
      borderWidth: 1,
      borderRadius: 10,
      height: 48,
      fontSize: 16,
      color: '#000',
      paddingHorizontal: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    suggestionsContainer: {
      backgroundColor: '#fff',
      borderRadius: 10,
      marginTop: 4,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    suggestionItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomColor: '#eee',
      borderBottomWidth: 1,
    },
    suggestionText: {
      main: {
        fontSize: 15,
        color: '#222',
      },
      secondary: {
        fontSize: 13,
        color: '#777',
      },
    },
    loadingIndicator: {
      color: '#999',
    },
    placeholder: {
      color: '#888',
    },
    text: {
      color: '#000',
    },
  };

  return (
    <GooglePlacesTextInput
      apiKey={GOOGLE_MAPS_API_KEY}
      placeHolderText="Search for a garage"
      onPlaceSelect={handlePlaceSelect}
      fetchDetails={true}
      types={['parking']}
      detailsFields={['formattedAddress', 'location', 'displayName']}
      style={customStyles}
      locationRestriction={{
        rectangle: {
          low: { latitude: 40.39286, longitude: -86.954622 },
          high: { latitude: 40.466874, longitude: -86.871755 },
        },
      }}
    />
  );
};

export default StyledGooglePlacesTextInput;
