import Config from 'react-native-config';
import GooglePlacesTextInput from 'react-native-google-places-textinput';

const StyledGooglePlacesTextInput = () => {
  const handlePlaceSelect = (place: any) => {
    console.log('Selected place:', place);
  };

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
      apiKey={Config.GOOGLE_MAPS_API!}
      placeHolderText="Search for a place"
      onPlaceSelect={handlePlaceSelect}
      fetchDetails={true}
      detailsFields={['formattedAddress', 'location']}
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
