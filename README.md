# react-native-vertical-viewpager
垂直ViewPager，仿京东商详页

#Simple
import React, {Component, PropTypes} from 'react';

import {
    StyleSheet,
    View,
    Text,
    Dimensions
} from 'react-native';

import VerticalViewPager from 'react-native-vertical-viewpager'

import QATest from '../../test/QATest'

import Settings from '../../set/Setting'

const {height, width} = Dimensions.get('window');

export default class RCTComponents extends Component {

    render() {
        return (
            <View style={RCTComponentsStyles.container}>
                <VerticalViewPager>
                    <Settings style={{backgroundColor: "red",height:height+400}} tabLabel="Settings"/>
                    <QATest style={{height:height+400}} tabLabel="QATest"/>
                </VerticalViewPager>
            </View>
        );
    }

}

const RCTComponentsStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
});