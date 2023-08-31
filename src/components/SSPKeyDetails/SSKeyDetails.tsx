import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks';
import { getUniqueId } from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useAppSelector } from '../../hooks';

const CryptoJS = require('crypto-js');

const SSPKeyDetails = (props: { actionStatus: (status: boolean) => void }) => {
  // ssp key seed phrase, flux xpriv, xpub
  const { xpubKey, xprivKey } = useAppSelector((state) => state.flux);
  const { seedPhrase } = useAppSelector((state) => state.ssp);
  const [decryptedXpub, setDecryptedXpub] = useState('');
  const [deryptedXpriv, setDecryptedXpriv] = useState('');
  const [decryptedMnemonic, setDecryptedMnemonic] = useState('');
  const [xpubVisible, setXpubVisible] = useState(false);
  const [xprivVisible, setXprivVisible] = useState(false);
  const [mnemonicVisible, setMnemonicVisible] = useState(false);
  const { t } = useTranslation(['home', 'common']);
  const { Fonts, Gutters, Layout, Colors, Common } = useTheme();

  useEffect(() => {
    getUniqueId()
      .then(async (id) => {
        console.log('here');
        // clean up password from encrypted storage
        const password = await EncryptedStorage.getItem('ssp_key_pw');
        const pwForEncryption = id + password;
        const xpk = CryptoJS.AES.decrypt(xprivKey, pwForEncryption);
        const xprivKeyDecrypted = xpk.toString(CryptoJS.enc.Utf8);
        const xpubk = CryptoJS.AES.decrypt(xpubKey, pwForEncryption);
        const xpubDecrypted = xpubk.toString(CryptoJS.enc.Utf8);
        const mmm = CryptoJS.AES.decrypt(seedPhrase, pwForEncryption);
        const mnemonicPhrase = mmm.toString(CryptoJS.enc.Utf8);
        setDecryptedXpub(xpubDecrypted);
        setDecryptedXpriv(xprivKeyDecrypted);
        setDecryptedMnemonic(mnemonicPhrase);
      })
      .catch((error) => {
        console.log(error.message);
      });
  }, []);

  const close = () => {
    console.log('Close');
    setXprivVisible(false);
    setXpubVisible(false);
    setMnemonicVisible(false);
    setDecryptedXpriv('');
    setDecryptedXpub('');
    setDecryptedMnemonic('');
    props.actionStatus(false);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={() => close()}
    >
      <ScrollView
        style={[Layout.fill, Common.modalBackdrop]}
        contentContainerStyle={[
          Gutters.smallBPadding,
          Layout.scrollSpaceBetween,
          Common.modalView,
        ]}
      >
        <Text style={[Fonts.titleSmall, Fonts.textCenter]}>
          {t('home:flux_ssp_details')}
        </Text>
        <View
          style={[
            Layout.fill,
            Layout.relative,
            Layout.fullWidth,
            Layout.alignItemsCenter,
            Gutters.regularTMargin,
          ]}
        >
          <View>
            <View
              style={[
                Gutters.regularTMargin,
                Layout.rowCenter,
                Gutters.tinyRMargin,
              ]}
            >
              <TouchableOpacity
                onPressIn={() => setMnemonicVisible(!mnemonicVisible)}
                style={Common.inputIcon}
              >
                <Icon
                  name={mnemonicVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color={Colors.bluePrimary}
                />
              </TouchableOpacity>
              <Text style={[Fonts.textBold, Fonts.textSmall, Fonts.textCenter]}>
                {t('home:ssp_key_mnemonic')}:
              </Text>
            </View>
            <View>
              <Text
                selectable={true}
                style={[Fonts.textTiny, Fonts.textCenter, Gutters.smallMargin]}
              >
                {mnemonicVisible
                  ? decryptedMnemonic
                  : '*** *** *** *** *** ***'}
              </Text>
            </View>
          </View>
          <View>
            <View style={[Layout.rowCenter, Gutters.tinyRMargin]}>
              <TouchableOpacity
                onPressIn={() => setXpubVisible(!xpubVisible)}
                style={Common.inputIcon}
              >
                <Icon
                  name={xpubVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color={Colors.bluePrimary}
                />
              </TouchableOpacity>
              <Text style={[Fonts.textBold, Fonts.textSmall, Fonts.textCenter]}>
                {t('home:flux_xpub')}:
              </Text>
            </View>
            <View>
              <Text
                selectable={true}
                style={[Fonts.textTiny, Fonts.textCenter, Gutters.smallMargin]}
              >
                {xpubVisible ? decryptedXpub : '*** *** *** *** *** ***'}
              </Text>
            </View>
          </View>
          <View>
            <View style={[Layout.rowCenter, Gutters.tinyRMargin]}>
              <TouchableOpacity
                onPressIn={() => setXprivVisible(!xprivVisible)}
                style={Common.inputIcon}
              >
                <Icon
                  name={xprivVisible ? 'eye' : 'eye-off'}
                  size={20}
                  color={Colors.bluePrimary}
                />
              </TouchableOpacity>
              <Text style={[Fonts.textBold, Fonts.textSmall, Fonts.textCenter]}>
                {t('home:flux_xpriv')}:
              </Text>
            </View>
            <View>
              <Text
                selectable={true}
                style={[Fonts.textTiny, Fonts.textCenter, Gutters.smallMargin]}
              >
                {xprivVisible ? deryptedXpriv : '*** *** *** *** *** ***'}
              </Text>
            </View>
          </View>
        </View>
        <View style={[Layout.justifyContentEnd]}>
          <TouchableOpacity
            style={[
              Common.button.outlineRounded,
              Common.button.secondaryButton,
              Layout.fullWidth,
              Gutters.regularTMargin,
            ]}
            onPressIn={() => close()}
          >
            <Text
              style={[
                Fonts.textSmall,
                Fonts.textBluePrimary,
                Gutters.regularHPadding,
              ]}
            >
              {t('common:ok')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
};

export default SSPKeyDetails;
