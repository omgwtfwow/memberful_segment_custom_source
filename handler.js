const _ = require('lodash');
exports.processEvents = async (event) => {
    let eventBody = event.payload.body,
        eventHeaders = event.payload.headers,
        queryParameters = event.payload.queryParameters,
        memberfulEvent = eventBody['event'],
        member = _.get(eventBody, 'member', false),
        order = _.get(eventBody, 'order', false),
        subscriptions,
        subscription,
        subscriptionInQuestion = _.get(eventBody, 'subscription', false),
        subscriptionPlan;
    const eventNameArray = {
        "member_signup": "Signed Up",
        "member_updated": "Member Updated",
        "order.purchased": "Order Completed",
        "order.refunded": "Order Refunded",
        "order.suspended": "Order Suspended",
        "subscription.created": "Subscription Created",
        "subscription.updated": "Subscription Updated",
        "subscription.renewed": "Subscription Renewed",
        "subscription.deactivated": "Subscription Deactivated",
        "subscription.activated": "Subscription Activated",
        "subscription.deleted": "Subscription Deleted"
    };
    if (order !== false) {
        subscriptions = _.get(order, 'subscriptions', false);
        subscription = _.get(subscriptions[0], 'subscription', false);
    }
    if (subscriptionInQuestion !== false) {
        subscriptionPlan = _.get(subscriptionInQuestion, 'subscription_plan', false)
    }
    let eventName = function (memberfulEvent) {
        if (eventNameArray[memberfulEvent] !== 'null' && eventNameArray[memberfulEvent] !== null && eventNameArray[memberfulEvent] !== null) {
            return eventNameArray[memberfulEvent];
        } else {
            return null;
        }
    };
    if (eventName !== "" && eventName !== 'null' && eventName !== null) {
        let userId = function (eventBody) {
                let val;
                if (member !== false) {
                    val = member.id;
                }
                if (order !== false) {
                    member = _.get(eventBody.order, 'member', false);
                    val = member.id;
                }
                if (subscriptionInQuestion !== false) {
                    member = _.get(subscriptionInQuestion, 'member', false);
                    val = member.id;
                }
                return val.toString();
            },
            identify,
            track,
            eventProperties = function (memberfulEvent) {
                if (memberfulEvent === 'member_signup') {
                    return {
                        userId: userId(memberfulEvent),
                        email: member.email,
                        firstName: member.first_name,
                        lastName: member.last_name,
                        name: member.full_name,
                        memberfulCustomField: member.custom_field,
                        signupMethod: member.signup_method
                    };
                }
                if (memberfulEvent === 'member_updated') {
                    return {
                        userId: userId(memberfulEvent),
                        email: member.email,
                        changed: {
                            old_email: eventBody.changed.email[0],
                            new_email: eventBody.changed.email[1]
                        }
                    };
                }
                if (memberfulEvent === 'order.purchased' || memberfulEvent === 'order.refunded' || memberfulEvent === 'order.suspended') {
                    return {
                        orderTotal: order.total / 100,
                        value: order.total / 100,
                        total: order.total / 100, //my project doesn't require 'revenue'
                        currency: 'AUD',
                        stripeCustomerId: order.member.stripe_customer_id,
                        checkoutId: order.uuid,
                        order_id: order.number,
                        order_status: order.status,
                        receipt: order.receipt,
                        products: {
                            product_id: subscription.id,
                            sku: subscription.id,
                            name: subscription.name,
                            price: subscription.price / 100,
                            category: subscription.renewal_period,
                            activatedAt: subscription.ativated_at,
                            createdAt: subscriptions[0].created_at,
                            expiresAt: subscriptions[0].expires_at
                        }
                    };
                }
                if (memberfulEvent === 'subscription.created' || 'subscription.updated' || 'subscription.renewed' || 'subscription.deactivated' || 'subscription.activated' || 'subscription.deleted') {
                    return {
                        plan_id: subscriptionPlan.id,
                        plan_price: subscriptionPlan.price / 100,
                        plan_name: subscriptionPlan.name,
                        plan_interval_unit: subscriptionPlan.interval_unit,
                        plan_interval_count: subscriptionPlan.interval_count,
                        subscription_id: subscriptionInQuestion.id,
                        subscription_created: subscriptionInQuestion.created_at,
                        subscription_expires_at: subscriptionInQuestion.expires_at,
                        subscription_autorenew: subscriptionInQuestion.autorenew,
                        subscription_active: subscriptionInQuestion.active,
                        userId: userId(eventBody),
                        email: member.email,
                        changed: {
                            old_email: member.changed[0],
                            new_email: member.changed[1]
                        }
                    };
                }
            };
        //identify
        identify = {
            type: 'identify',
            userId: userId(eventBody),
            traits: {
                email: member.email,
                firstName: member.first_name,
                lastName: member.last_name,
                name: member.full_name,
                number: member.phone_number,
                stripeCustomerId: member.stripe_customer_id,
                address: member.address,
                memberfulCustomField: member.custom_field,
                creditCard: member.credit_card,
                signupMethod: member.signup_method
            }
        };
        track = {
            type: 'track',
            event: eventName(memberfulEvent),
            userId: userId(eventBody),
            properties: eventProperties(memberfulEvent)
        };

        let returnValue = {events: [identify, track]};
        return (returnValue);
    }
};

