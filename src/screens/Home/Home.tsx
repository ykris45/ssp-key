import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks';
import Icon from 'react-native-vector-icons/Feather';
import IconB from 'react-native-vector-icons/MaterialCommunityIcons';
import Divider from '../../components/Divider/Divider';
import { getUniqueId } from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import axios from 'axios';

const CryptoJS = require('crypto-js');

import {
  getMasterXpriv,
  getMasterXpub,
  generateMultisigAddress,
  generateIdentityAddress,
  generateAddressKeypair,
} from '../../lib/wallet';

import {
  signTransaction,
  finaliseTransaction,
  broadcastTx,
  fetchUtxos,
} from '../../lib/constructTx';

import {
  setXpubKey,
  setXprivKey,
  setXpubWallet,
  setRedeemScript,
  setAddress,
  setSspWalletKeyIdentity,
  setsspWalletIdentity,
} from '../../store/flux';

import { useAppSelector, useAppDispatch } from '../../hooks';

type Props = {
  navigation: any;
};

function Home({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation(['welcome', 'common']);
  const { Fonts, Gutters, Layout, Images, Colors, Common } = useTheme();
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isManuaInputlModalOpen, setIsManualInputModalOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const { seedPhrase } = useAppSelector((state) => state.ssp);
  const {
    address,
    redeemScript,
    xpubWallet,
    xpubKey,
    xprivKey,
    sspWalletKeyIdentity,
    sspWalletIdentity,
  } = useAppSelector((state) => state.flux);
  console.log('seedPhrase', seedPhrase);
  // if seedPhrse does not exist, navigate to Welcome page
  if (!seedPhrase) {
    navigation.navigate('Welcome');
    return <></>;
  }

  if (!xpubKey || !xprivKey) {
    // just a precaution to make sure xpub and xpriv are set. Should acutally never end up here
    getUniqueId()
      .then(async (id) => {
        // clean up password from encrypted storage
        const password = await EncryptedStorage.getItem('ssp_key_pw');
        const pwForEncryption = id + password;
        const mmm = CryptoJS.AES.decrypt(seedPhrase, pwForEncryption);
        const mnemonicPhrase = mmm.toString(CryptoJS.enc.Utf8);
        // generate master xpriv for flux
        const xpriv = getMasterXpriv(mnemonicPhrase, 48, 19167, 0, 'p2sh'); // takes ~3 secs
        const xpub = getMasterXpub(mnemonicPhrase, 48, 19167, 0, 'p2sh'); // takes ~3 secs
        const xprivBlob = CryptoJS.AES.encrypt(
          xpriv,
          pwForEncryption,
        ).toString();
        const xpubBlob = CryptoJS.AES.encrypt(xpub, pwForEncryption).toString();
        dispatch(setXprivKey(xprivBlob));
        dispatch(setXpubKey(xpubBlob));
      })
      .catch((error) => {
        console.log(error.message);
      });
  }

  if (
    // todo use effect
    !address ||
    !redeemScript ||
    !xpubWallet ||
    !sspWalletKeyIdentity ||
    !sspWalletIdentity
  ) {
    console.log('Request for scanning QR code');
  }

  const generateAddresses = (suppliedXpubWallet: string) => {
    getUniqueId()
      .then(async (id) => {
        // clean up password from encrypted storage
        const password = await EncryptedStorage.getItem('ssp_key_pw');
        const pwForEncryption = id + password;
        const xpk = CryptoJS.AES.decrypt(xpubKey, pwForEncryption);
        const xpubKeyDecrypted = xpk.toString(CryptoJS.enc.Utf8);
        const addrInfo = generateMultisigAddress(
          suppliedXpubWallet,
          xpubKeyDecrypted,
          0,
          0,
          'flux',
        );
        console.log(addrInfo.address, addrInfo.redeemScript);
        dispatch(setAddress(addrInfo.address));
        const encryptedReedemScript = CryptoJS.AES.encrypt(
          addrInfo.redeemScript,
          pwForEncryption,
        ).toString();
        dispatch(setRedeemScript(encryptedReedemScript));
        const encryptedXpubWallet = CryptoJS.AES.encrypt(
          suppliedXpubWallet,
          pwForEncryption,
        ).toString();
        dispatch(setXpubWallet(encryptedXpubWallet));
        const generatedSspWalletKeyIdentity = generateMultisigAddress(
          suppliedXpubWallet,
          xpubKeyDecrypted,
          10,
          0,
          'flux',
        );
        dispatch(
          setSspWalletKeyIdentity(generatedSspWalletKeyIdentity.address),
        );
        // generate ssp wallet identity
        const generatedSspWalletIdentity = generateIdentityAddress(
          suppliedXpubWallet,
          'flux',
        );
        dispatch(setsspWalletIdentity(generatedSspWalletIdentity));
        console.log('TODO ALL DONE');
      })
      .catch((error) => {
        console.log(error.message);
      });
  };

  const openManualInput = () => {
    console.log('here');
    setIsMenuModalOpen(false);
    setTimeout(() => {
      setIsManualInputModalOpen(true);
    });
  };
  const handleCancelManualInput = () => {
    setIsManualInputModalOpen(false);
    setManualInput('');
  };
  const onChangeManualInput = (text: string) => {
    setManualInput(text);
  };
  const handleMnualInput = async () => {
    // check if input is xpub or transaction
    if (manualInput.startsWith('xpub')) {
      // xpub
      const xpubw = manualInput;
      generateAddresses(xpubw);
    } else if (manualInput.startsWith('04')) {
      // transaction
      // sign transaction
      if (!address || !redeemScript) {
        // display error, we are not synced yet with wallet
        console.log('not synced yet');
      } else {
        // todo some checks
        const rawTx = manualInput;

        const utxos = await fetchUtxos(address, 'flux');
        console.log(utxos);
        const id = await getUniqueId();
        const password = await EncryptedStorage.getItem('ssp_key_pw');

        const pwForEncryption = id + password;
        const xpk = CryptoJS.AES.decrypt(xprivKey, pwForEncryption);
        const xprivKeyDecrypted = xpk.toString(CryptoJS.enc.Utf8);
        const rds = CryptoJS.AES.decrypt(redeemScript, pwForEncryption);
        const redeemScriptDecrypted = rds.toString(CryptoJS.enc.Utf8);

        const keyPair = generateAddressKeypair(xprivKeyDecrypted, 0, 0, 'flux');
        console.log(keyPair);
        try {
          const signedTx = await signTransaction(
            rawTx,
            'flux',
            keyPair.privKey,
            redeemScriptDecrypted,
            utxos,
          );
          const finalTx = finaliseTransaction(signedTx, 'flux');
          console.log(finalTx);
          const txid = await broadcastTx(finalTx, 'flux');
          console.log(txid);
        } catch (error) {
          console.log(error);
        }
      }
    } else {
      // invalid input
    }
    // todo close input modal and clean input
  };
  const openHelp = () => {
    console.log('help');
  };
  const openSettings = () => {
    setIsMenuModalOpen(!isMenuModalOpen);
  };
  const scanCode = () => {
    console.log('scan code');
  };
  const handleRefresh = async () => {
    try {
      console.log('refresh');
      if (sspWalletIdentity) {
        // get some pending request
        const result = await axios.get(
          `https://relay.ssp.runonflux.io/v1/get/${sspWalletIdentity}`,
        );
        console.log('result', result.data);
      } else if (sspWalletKeyIdentity) {
        // get some pending request
        const result = await axios.get(
          `https://relay.ssp.runonflux.io/v1/get/${sspWalletKeyIdentity}`,
        );
        console.log('result', result.data);
      } else {
        console.log('no wallet synced yet');
      }
    } catch (error) {
      console.log(error);
    }
  };
  // refresh for pending actions needed
  // on click refresh pending actions
  return (
    <ScrollView
      style={Layout.fill}
      contentContainerStyle={[
        Layout.fullSize,
        Layout.fill,
        Layout.colCenter,
        Layout.scrollSpaceBetween,
      ]}
    >
      <View
        style={[
          Layout.row,
          Layout.justifyContentBetween,
          Layout.fullWidth,
          Gutters.smallHPadding,
          Gutters.tinyTMargin,
        ]}
      >
        <Image
          style={{ width: 35, height: 35 }}
          source={Images.ssp.logo}
          resizeMode={'contain'}
        />
        <View style={[Layout.row, Gutters.tinyTMargin]}>
          <TouchableOpacity
            onPress={() => openHelp()}
            style={[Gutters.smallRMargin]}
          >
            <Icon name="help-circle" size={22} color={Colors.textGray400} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openSettings()} style={[]}>
            <Icon name="settings" size={22} color={Colors.textGray400} />
          </TouchableOpacity>
        </View>
      </View>
      <Divider color={Colors.textGray200} />
      <View
        style={[
          Layout.fill,
          Layout.relative,
          Layout.fullWidth,
          Layout.justifyContentCenter,
          Layout.alignItemsCenter,
        ]}
      >
        <Icon name="key" size={60} color={Colors.textGray400} />
        <Text style={[Fonts.textBold, Fonts.textRegular, Gutters.smallMargin]}>
          No pending actions.
        </Text>
        <TouchableOpacity
          onPress={() => handleRefresh()}
          style={[Layout.row, Gutters.regularMargin]}
        >
          <IconB name="gesture-tap" size={30} color={Colors.bluePrimary} />
          <Text
            style={[
              Fonts.textSmall,
              Fonts.textBold,
              Fonts.textBluePrimary,
              Gutters.tinyTMargin,
              Gutters.tinyLMargin,
            ]}
          >
            Refresh
          </Text>
        </TouchableOpacity>
      </View>
      <View>
        <TouchableOpacity
          style={[
            Common.button.outlineRounded,
            Common.button.secondaryButton,
            Layout.fullWidth,
            Gutters.smallBMargin,
          ]}
          onPress={() => scanCode()}
        >
          <Text
            style={[
              Fonts.textSmall,
              Fonts.textBluePrimary,
              Gutters.regularHPadding,
            ]}
          >
            Scan code
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="fade"
        onRequestClose={() => {
          setIsMenuModalOpen(false);
        }}
        transparent={true}
        visible={isMenuModalOpen}
      >
        <TouchableWithoutFeedback
          onPressOut={() => {
            setIsMenuModalOpen(false);
          }}
        >
          <View style={[Layout.fill]}>
            <View style={[styles.modalMenu]}>
              <TouchableOpacity onPress={() => openManualInput()}>
                <Text
                  style={[
                    Fonts.textSmall,
                    Fonts.textBluePrimary,
                    Fonts.textCenter,
                    Gutters.tinyPadding,
                  ]}
                >
                  Manual Input
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openManualInput()}>
                <Text
                  style={[
                    Fonts.textSmall,
                    Fonts.textBluePrimary,
                    Fonts.textCenter,
                    Gutters.tinyPadding,
                  ]}
                >
                  Settings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Restore')}>
                <Text
                  style={[
                    Fonts.textSmall,
                    Fonts.textBluePrimary,
                    Fonts.textCenter,
                    Gutters.tinyPadding,
                  ]}
                >
                  Restore
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={isManuaInputlModalOpen}
        onRequestClose={() => handleCancelManualInput()}
      >
        <ScrollView
          style={[Layout.fill, styles.modalManualInput]}
          contentContainerStyle={[
            Gutters.smallBPadding,
            Layout.scrollSpaceBetween,
          ]}
        >
          <Text style={[Fonts.titleSmall, Gutters.tinyBMargin]}>
            Manul Input
          </Text>
          <Text style={[Fonts.titleSmall, Gutters.tinyBMargin]}>
            Sign transaction or resync wallet manually
          </Text>
          <View style={styles.seedPhraseArea}>
            <TextInput
              multiline={true}
              numberOfLines={4}
              style={styles.inputArea}
              inputMode="email"
              autoCapitalize="none"
              placeholder="Input your transaction to sign or xpub of your wallet to sync."
              secureTextEntry={false}
              onChangeText={onChangeManualInput}
              value={manualInput}
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={[
              Common.button.rounded,
              Common.button.bluePrimary,
              Gutters.regularBMargin,
              Gutters.smallTMargin,
            ]}
            onPress={() => handleMnualInput()}
          >
            <Text style={[Fonts.textRegular, Fonts.textWhite]}>
              Process input
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCancelManualInput()}>
            <Text
              style={[Fonts.textSmall, Fonts.textBluePrimary, Fonts.textCenter]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalMenu: {
    position: 'absolute',
    top: 40,
    right: 5,
    width: 150,
    backgroundColor: 'white',
    marginTop: 60,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalManualInput: {
    backgroundColor: 'white',
    margin: 30,
    marginTop: 60,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  seedPhraseArea: {
    width: '80%',
    height: 100,
  },
  inputArea: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
    color: '#424242',
    borderRadius: 10,
    marginTop: 16,
  },
});

export default Home;
