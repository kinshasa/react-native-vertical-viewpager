/**
 * @Author: liushaobo2005@163.com
 * @Date: 2017.2.28 下午 2:14
 * @Desc: 公共组件 - VerticalViewPager
 * @Name: VerticalViewPager.js
 * @LifeCycle：http://www.tuicool.com/articles/nu6zInB
 */
import React, {Component, PropTypes} from "react";
import {
    StyleSheet,
    View,
    Text,
    Dimensions,
    TouchableNativeFeedback,
    ScrollView,
    Animated,
    InteractionManager,
    ActivityIndicator
} from "react-native";

import Icon from 'react-native-vector-icons/FontAwesome';
const {height, width} = Dimensions.get('window');

/**
 * 防止计算误差，拉伸到多于5的距离才起作用
 * @type {number}
 */
const PULL_TO_SCROLL_MAX = 5;

/**
 * 0表示不需要人为计算滚动位置或在计算中，1表示开始计算滚动位置并人为滚动
 * @type {{STATE_CALC_DISABLE: boolean, STATE_CALC_ENABLE: boolean}}
 */
const SCROLL_CALC_STATE = {
    "STATE_CALC_DISABLE": false,//计算中或不需要计算
    "STATE_CALC_ENABLE": true,//开始计算
};

/**
 * SCROLLVIEW触摸状态，用于判断ScrollView状态处理
 * @type {{STATUS_TOUCH_NO: number, STATUS_TOUCH_BEGIN: number, STATUS_TOUCH_END: number, STATUS_SCROLL_BEGIN: number, STATUS_SCROLL_END: number}}
 */
const TOUCH_STATUS = {
    "STATUS_TOUCH_NO": 0,//没有触摸
    "STATUS_TOUCH_BEGIN": 1,//触摸开始
    "STATUS_TOUCH_END": 2,//触摸释放
    "STATUS_SCROLL_BEGIN": 3,//滑动开始
    "STATUS_SCROLL_END": 4,//滑动结束
};

class PullIcon extends Component{

    constructor(props, context) {
        super(props, context);
        this.state={
            name:'angle-up',
            text:'上拉查看图文详情'
        }
    }

    setIconUp(){
        this.setState({
            name:'angle-up',
            text:'上拉查看图文详情'
        });
    }

    setIconDown(){
        this.setState({
            name:'angle-down',
            text:'下拉收起图文详情'
        });
    }

    render(){
        return (
            <Icon.Button
                ref={(ref)=>{this.pullLabel = ref}}
                color="#555"
                style={VerticalViewPagerStyles.pullView}
                name={this.state.name}
                backgroundColor="#fff">
                <Text
                    color="#555"
                    style={VerticalViewPagerStyles.pullView}>
                    {this.state.text}
                </Text>
            </Icon.Button>
        )
    }
};

export default class VerticalViewPager extends Component {

    /**
     * 父组件传入的属性值
     * @type {{style: *, account: *, name: *, isTrue: *, callback: *}}
     */
    static propTypes = {
        style: View.propTypes.style,
        account: PropTypes.number,
        name: PropTypes.string,
        isTrue: PropTypes.bool,
        callback: PropTypes.func,
    };

    /**
     * 父组件传入的数据
     * @type {{data: {}}}
     */
    static defaultProps = {
        data: {}
    };

    /**
     * 构造函数
     * @param props
     * @param context
     */
    constructor(props, context) {
        console.log("VerticalViewPager constructor()__DEV__", __DEV__);
        super(props, context);
        this.state = {
            lazyStatus: false,//BottomView的懒加载
        };
        this.layout = {
            scrollViewLayout: {},//ScrollView的布局
            topViewLayout: {},//TopView的布局
            bottomViewLayout: {}//BottomView的布局
        };
        this.scrollOffset = {
            begin: {},//beginDrag和scrollBegin的最新值
            end: {},//beginDrag和scrollBegin的最新值
            beginDrag: {},//ScrollView触摸起始坐标
            endDrag: {},//ScrollView触摸停止坐标
            scrollBegin: {},//ScrollView滑动起始坐标
            scrollEnd: {},//ScrollView滑动停止坐标
            threshold: 0,//下拉可以看到bottomView的距离
            pos: 0,//表示触摸前底部栏所处ScrollView的位置，0表示TopView，1表示BottomView
            type: 0,//0表示下拉，1表示上拉
            state: SCROLL_CALC_STATE.STATE_CALC_DISABLE,//表示是否在滚动计算中
            status: TOUCH_STATUS.STATUS_TOUCH_NO,//0没有滑动，1开始触摸滑动，2结束触摸，3释放手后自动滑动，4释放手后自动滑动停止(没有自动滑动即2，有即4)
        };
    }

    /**
     * 当前组件渲染次数
     * @type {number}
     */
    renderCount = 0;

    /**
     * 组件加载前
     * 生命周期中仅被调用1次，可以使用SetState
     */
    componentWillMount() {
        console.log("VerticalViewPager", "componentWillMount()");
    }

    /**
     * 组件加载后
     * 生命周期中仅被调用1次，可以使用SetState
     * 用于网络请求和页面渲染
     */
    componentDidMount() {
        //console.log("VerticalViewPager", "componentDidMount() refs:",this.refs['pullLabel'].setNativeProps);
        /*this.refs['pullLabel'] && this.refs['pullLabel'].setNativeProps({
            name:'angle-down'
        })*/
    }

    /**
     * 父组件属性值变更监听
     * 可以使用SetState
     * @param newProps
     */
    componentWillReceiveProps(newProps) {
        console.log("VerticalViewPager", "componentWillReceiveProps():" + newProps);
    }

    /**
     * 属性值/状态值变更后，是否需要刷新页面
     * @param nextProps 是即将被设置的属性，旧的属性还是可以通过 this.props 来获取。
     * @param nextState 表示组件即将更新的状态值。
     * @returns {boolean} 默认true, 返回值决定是否需要更新组件，如果 true 表示需要更新，继续走后面的更新流程。
     */
    shouldComponentUpdate(nextProps, nextState) {
        let isUpdate = (this.props != nextProps) || (this.state != nextState);
        console.log("VerticalViewPager", "shouldComponentUpdate():" + isUpdate);
        return isUpdate;
    }

    /**
     * 如果组件状态或者属性改变，并且shouldComponentUpdate返回为 true
     * @param nextProps 更新之后的属性
     * @param nextState 更新之后的状态
     */
    componentWillUpdate(nextProps, nextState) {
        console.log("VerticalViewPager", "componentWillUpdate()");
    }

    /**
     * 更新完成界面之后通知
     * @param prevProps 更新之前的属性
     * @param prevState 更新之前的状态
     * @returns {boolean}
     */
    componentDidUpdate(prevProps, prevState) {
        console.log("VerticalViewPager", "componentDidUpdate()");
    }

    /**
     * 组件即将卸载前调用
     * 在这个函数中，可以做一些组件相关的清理工作，例如取消计时器、网络请求等。
     */
    componentWillUnmount() {
        console.log("VerticalViewPager", `componentWillUnmount()`);

    }

    /**
     * ScrollView在滚动中，监听控件数据
     * @param offset
     */
    onScroll(offset) {
        //console.log("VerticalViewPager", `onScroll() offset:${offset.y}；status:${this.scrollOffset.status};pos:${this.scrollOffset.pos}`);

        //释放触摸后不是"自动滑动中"，则不需要计算
        if (this.scrollOffset.status != TOUCH_STATUS.STATUS_SCROLL_BEGIN) {
            return;
        }

        //触摸前在TopView中,下拉动滑动中
        if (this.scrollOffset.pos == 0) {

            //下拉可以看到bottomView的距离
            this.scrollOffset.threshold = this.layout.topViewLayout.height - this.layout.scrollViewLayout.height + this.layout.topViewLayout.y - PULL_TO_SCROLL_MAX;
            //console.log("VerticalViewPager", `onScroll() threshold:${ this.scrollOffset.threshold}；offset.y:${offset.y};state:${this.scrollOffset.state}`);
            //如果滑动中的距离大于threshold的高度，则不需要让它继续滑动，需要停止到onScrollTop()
            if (offset.y >= this.scrollOffset.threshold) {
                //如果pullToPos()已经扑住到滑动，则直接返回
                if (this.scrollOffset.state == SCROLL_CALC_STATE.STATE_CALC_ENABLE) {
                    return;
                }
                this.scrollOffset.state = SCROLL_CALC_STATE.STATE_CALC_ENABLE;
                this.scrollOffset.status = TOUCH_STATUS.STATUS_SCROLL_END;
                this.onScrollTop('onScroll');
            }
        } else {
            //TopView的底部坐标
            let topViewBottomY = this.layout.topViewLayout.height + this.layout.topViewLayout.y - PULL_TO_SCROLL_MAX;
            //console.log("VerticalViewPager", `onScroll() topViewBottomY:${ topViewBottomY}；offset.y:${offset.y};state:${this.scrollOffset.state}`);
            //触摸前在BottomView中,上拉动滑动中
            //如果滑动中的距离大于TopView的高度，则不需要让它继续滑动，需要停止到onScrollDown()
            if (offset.y <= topViewBottomY) {
                //如果pullToPos()已经扑住到滑动，则直接返回
                if (this.scrollOffset.state == SCROLL_CALC_STATE.STATE_CALC_ENABLE) {
                    return;
                }
                this.scrollOffset.state = SCROLL_CALC_STATE.STATE_CALC_ENABLE;
                this.scrollOffset.status = TOUCH_STATUS.STATUS_SCROLL_END;
                this.onScrollDown('onScroll');
            }
        }

    }

    /**
     * 下拉到bottomView顶端，或恢复到bottomView顶端
     */
    onScrollDown(type) {
        console.log("VerticalViewPager", `onScrollDown(${type}) ${JSON.stringify(this.layout.bottomViewLayout)}`);
        this.refs['scrollView'] && this.refs['scrollView'].scrollTo({
            y: this.layout.bottomViewLayout.y,
            animated: true
        });

        //如果当前视图在BottomView中且第一次加载，则懒加载BottomView
        //后期封装一个LazyView
        setTimeout(() => {
            if (this.state.lazyStatus == false) {
                this.setState({lazyStatus: true});
            }
        }, 1000);
        this.refs['pullView'] && this.refs['pullView'].setIconDown();
    }

    /**
     * 上拉到topView底端，或恢复到topView底端
     */
    onScrollTop() {
        console.log("VerticalViewPager", `onScrollTop()`);
        this.refs['scrollView'] && this.refs['scrollView'].scrollTo({y: this.scrollOffset.threshold, animated: true});
        this.refs['pullView'] && this.refs['pullView'].setIconUp();
    }


    /**
     * 返回触摸前视图所在的位置
     * @returns {number}
     */
    getCurrentViewPos() {
        //TopView的底部坐标
        let topViewBottomY = this.layout.topViewLayout.height + this.layout.topViewLayout.y;

        //console.log("VerticalViewPager", `getCurrentViewPos() topViewBottomY: ${topViewBottomY}`);
        //console.log("VerticalViewPager", `getCurrentViewPos() beginDrag.y: ${this.scrollOffset.beginDrag.y}`);

        //判断当前所处ScrollView的组件位置
        if (this.scrollOffset.beginDrag.y <= this.scrollOffset.threshold + PULL_TO_SCROLL_MAX) {
            //触摸前可见View底部栏在TopView中
            this.scrollOffset.pos = 0;
        } else if (this.scrollOffset.beginDrag.y >= (topViewBottomY - PULL_TO_SCROLL_MAX/*PULL_TO_SCROLL_MAX为防止误差*/)) {
            //触摸前底部栏在BottomView中
            this.scrollOffset.pos = 1;
        } else {
            //其他特殊情况
            this.scrollOffset.pos = 2;
        }

        //console.log("VerticalViewPager", `getCurrentViewPos() pos: ${this.scrollOffset.pos}`);

        return this.scrollOffset.pos;
    }

    /**
     * 滚动计算最终位置
     * @param type
     */
    pullToPos(type) {
        //console.log("VerticalViewPager", `pullToPos(${type})state: ${this.scrollOffset.state}`);
        //如果在计算中则不需要重复计算
        if (this.scrollOffset.state == SCROLL_CALC_STATE.STATE_CALC_ENABLE) {
            return;
        }

        this.scrollOffset.state = SCROLL_CALC_STATE.STATE_CALC_ENABLE;

        if (this.scrollOffset.beginDrag.y <= this.scrollOffset.endDrag.y) {
            //下拉
            this.scrollOffset.type = 0;
        } else {
            //上拉
            this.scrollOffset.type = 1;
        }
        //下拉可以看到bottomView的距离
        this.scrollOffset.threshold = this.layout.topViewLayout.height - this.layout.scrollViewLayout.height + this.layout.topViewLayout.y;

        //获取触摸前视图所在的上/下视图中：this.scrollOffset.pos
        this.getCurrentViewPos();

        if (this.scrollOffset.type == 0 && this.scrollOffset.pos == 1) {
            //如果目前就在TopView中，且下拉没有到达BottomView视图中，是不需要人为干扰ScrollView的ScrollTo方法的
            this.scrollOffset.state = SCROLL_CALC_STATE.STATE_CALC_DISABLE;
            return;
        }

        if (this.scrollOffset.type == 1 && this.scrollOffset.pos == 0) {
            //如果目前就在BottomView中，且上拉没有到达TopView视图中，是不需要人为干扰ScrollView的ScrollTo方法的
            this.scrollOffset.state = SCROLL_CALC_STATE.STATE_CALC_DISABLE;
            return;
        }

        //ScrollView下拉到滑动停止后的距离
        let y = this.scrollOffset.end.y;

        //下拉
        if (this.scrollOffset.type == 0) {
            //console.log("VerticalViewPager", `pullToPos(${type}) y:${y};threshold:${this.scrollOffset.threshold}`);
            //console.log("VerticalViewPager", `pullToPos(${type}) y:${y};threshold2:${this.scrollOffset.threshold + PULL_TO_SCROLL_MAX}`);
            if (y > (this.scrollOffset.threshold + PULL_TO_SCROLL_MAX)) {
                //下拉到bottomView顶端
                this.onScrollDown('pullToPos');
            } else if (y > this.scrollOffset.threshold) {
                //不超过下拉临界值+PULL_TO_SCROLL_MAX，不用下拉，恢复到topView的底端
                this.onScrollTop('pullToPos');
            } else {
                this.scrollOffset.state = SCROLL_CALC_STATE.STATE_CALC_DISABLE;
                console.log("VerticalViewPager", `cannot pullToPos down.`);
            }
        } else {
            //上拉可以看到TopView的距离为 TopView底部坐标(TopView的高度和Y轴值)
            let topViewBottomY = this.layout.topViewLayout.height + this.layout.topViewLayout.y;
            if (y < (topViewBottomY - PULL_TO_SCROLL_MAX)) {
                //上拉到TopView顶端
                this.onScrollTop('pullToPos');
            } else if (y > topViewBottomY) {
                //不超过下拉临界值+PULL_TO_SCROLL_MAX，不用下拉，恢复到topView的底端
                this.onScrollDown('pullToPos');
            } else {
                this.scrollOffset.state = SCROLL_CALC_STATE.STATE_CALC_DISABLE;
                console.log("VerticalViewPager", `cannot pullToPos up.`);
            }
        }
        //console.log("VerticalViewPager", `pullToPos(${type})scrollOffset: ${JSON.stringify(this.scrollOffset)}`);
        //console.log("VerticalViewPager", `pullToPos(${type})layout: ${JSON.stringify(this.layout)}`);
    }

    /**
     * 获取子组件
     * @param children
     * @returns {*}
     * @private
     */
    _children(children = this.props.children) {
        if (this.props.children == null)
            return [this.renderSimpleTopView(), this.renderSimpleBottomView()];
        return React.Children.map(children, (child) => child);
    };

    /**
     * TopView页面
     */
    renderTopView() {
        return this._children().map((child, idx) => {
            if (idx == 0 && child)
                return (
                    <View
                        onLayout={(e)=>{this.layout.topViewLayout = e.nativeEvent.layout}} key={child.key}>
                        {child}
                        {/*上拉查看/下拉收起图文详情*/}
                        {this.renderPullView()}

                    </View>
                );
        });
    }

    /**
     * TopView示例页面
     * @returns {XML}
     */
    renderSimpleTopView() {
        return (
            <View
                onLayout={(e)=>{this.layout.topViewLayout = e.nativeEvent.layout}}
                style={{width, minHeight: height+400, backgroundColor: "red",justifyContent:"flex-end"}}>
                <Text style={{backgroundColor: "red"}} tabLabel="Settings"/>
                {false &&
                <Text
                    onPress={()=>{this.onScrollDown()}}
                    style={VerticalViewPagerStyles.pullView}>下拉</Text>}

            </View>
        );
    }

    /**
     * BottomView页面
     */
    renderBottomView() {
        return this._children().map((child, idx) => {
            if (idx == 1 && child)
                return <View onLayout={(e)=>{this.layout.bottomViewLayout = e.nativeEvent.layout}}
                             key={child.key}>{child}</View>;
        });
    }

    /**
     * BottomView示例页面
     * @returns {XML}
     */
    renderSimpleBottomView() {
        return (
            <View
                onLayout={(e)=>{this.layout.bottomViewLayout = e.nativeEvent.layout}}
                style={{width, minHeight: height,backgroundColor: "green"}}>
                {

                    <Text style={{height:height+400}} tabLabel="QATest"/>
                }
            </View>
        );
    }

    /**
     * 懒加载页面，后期可以用StaticContainer代替
     * @returns {XML}
     */
    renderLazyView() {
        return (
            <View
                onLayout={(e)=>{this.layout.bottomViewLayout = e.nativeEvent.layout}}
                style={{width, minHeight: height, backgroundColor: "transparent",alignSelf:"center"}}>
                {
                    false &&
                    <Text
                        onPress={()=>{this.onScrollTop()}}
                        style={VerticalViewPagerStyles.pullView}>上拉</Text>
                }
                <ActivityIndicator
                    animating={true}
                    style={{alignSelf: 'center',justifyContent: 'center',padding: 8,height: 80}}
                    size="large"
                />
            </View>
        );
    }

    /**
     * 上拉查看/下拉收起图文详情
     * @returns {XML}
     */
    renderPullView() {
        return (
            <PullIcon ref="pullView"/>

        );
    }

    render() {
        this.renderCount++;
        console.log("VerticalViewPager render() renderCount:", this.renderCount);
        return (
            <ScrollView
                pagingEnabled
                alwaysBounceVertical
                scrollsToTop
                scrollEventThrottle={200}
                ref="scrollView"
                onScroll={(e)=>{{this.onScroll(e.nativeEvent.contentOffset)}}}
                onLayout={(e)=>{this.layout.scrollViewLayout = e.nativeEvent.layout}}
                onScrollBeginDrag={(e) => {
                    this.scrollOffset.beginDrag = e.nativeEvent.contentOffset;
                    this.scrollOffset.begin = e.nativeEvent.contentOffset;
                    this.scrollOffset.state = SCROLL_CALC_STATE.STATE_CALC_DISABLE;
                    this.scrollOffset.status = TOUCH_STATUS.STATUS_TOUCH_BEGIN;
                }}
                onScrollEndDrag={(e) => {
                    this.scrollOffset.endDrag = e.nativeEvent.contentOffset;
                    this.scrollOffset.end = e.nativeEvent.contentOffset;
                    this.scrollOffset.status = TOUCH_STATUS.STATUS_TOUCH_END;
                    this.pullToPos('onScrollEndDrag');
                }}
                onMomentumScrollBegin={(e) => {
                    this.scrollOffset.scrollBegin = e.nativeEvent.contentOffset;
                    //this.scrollOffset.begin = e.nativeEvent.contentOffset;
                    this.scrollOffset.status = TOUCH_STATUS.STATUS_SCROLL_BEGIN;
                }}
                onMomentumScrollEnd={(e) => {
                    this.scrollOffset.end = e.nativeEvent.contentOffset;
                    this.scrollOffset.scrollEnd = e.nativeEvent.contentOffset;
                    this.scrollOffset.status = TOUCH_STATUS.STATUS_SCROLL_END;
                    this.pullToPos('onMomentumScrollEnd');
                }}
                style={VerticalViewPagerStyles.container}>

                {/*TopView*/}
                {this.renderTopView()}

                {/*BottomView this.state.lazyStatus && */}
                {this.state.lazyStatus && this.renderBottomView()}

                {/*LazyView !this.state.lazyStatus && */}
                {!this.state.lazyStatus && this.renderLazyView()}
            </ScrollView>
        );
    }

}

const VerticalViewPagerStyles = StyleSheet.create({
    container: {
        width: width,
        backgroundColor: "#aaa",
        flex: 1
    },
    pullView: {
        margin: 5, alignSelf: "center"
    }
});