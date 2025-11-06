import React, { useState } from 'react'
import { View, Text, Modal } from 'react-native'



const Card = (place: any) => {

const [modalVisible, setModalVisible] = useState(false);


  return (
    <Modal
    visible={modalVisible}

    onRequestClose={() => {
            setModalVisible(!modalVisible);
          }}>
        <Text>place.details.formattedAddress</Text>
    </Modal>
  )
}

export default Card