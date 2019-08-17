const _ = require('lodash');
const merge = require('lodash.merge');
exports.processEvents = async (event) => {
    let eventBody = event.payload.body,
        eventHeaders = event.payload.headers,
        queryParameters = event.payload.queryParameters,
        returnValue = {events: []},
        memberfulEvent;
    if (_.get(eventBody, 'event', false) === false) {
        return (returnValue);
    } else {
        memberfulEvent = _.get(eventBody, 'event');
    }
    //events not handled
    const notInteresting = [
        "subscription_plan.created",
        "subscription_plan.updated",
        "subscription_plan.deleted",
        "download.created",
        "download.updated",
        "download.deleted"
    ];
    let notInterested = _.includes(notInteresting, memberfulEvent);
    if (notInterested === true) {
        return (returnValue);
    }
    //the events we are handling
    const eventNames = {
        "member_signup": "Signed Up",
        "member_updated": "Member Updated",
        "member_deleted": "Member Deleted",
        "order.purchased": "Order Completed",
        "order.refunded": "Order Refunded",
        "order.suspended": "Order Suspended",
        "order.completed": "Order Marked Complete",
        "subscription.created": "Subscription Created",
        "subscription.updated": "Subscription Updated",
        "subscription.renewed": "Subscription Renewed",
        "subscription.deactivated": "Subscription Deactivated",
        "subscription.activated": "Subscription Activated",
        "subscription.deleted": "Subscription Deleted"
    };
    let eventName = _.get(eventNames, memberfulEvent, false);
    if (eventName === false) {
        return (returnValue);
    }
    let member;
    let order;
    let subscription;
    member = _.get(eventBody, 'member', false);
    order = _.get(eventBody, 'order', false);
    subscription = _.get(eventBody, 'subscription', false);
    let userId = function () {
        if (member !== false) {
            return member.id.toString()
        }
        if (order !== false) {
            member = _.get(order, 'member');
            return member.id.toString()
        }
        if (subscription !== false) {
            member = _.get(subscription, 'member');
            return member.id.toString()
        }

        return null;

    };
    if (userId() === null) {
        return (returnValue);
    }
    let traits = {
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
    };
    let eventProperties = function () {
        //member events
        if (memberfulEvent === 'member_signup') {
            return {
                userId: userId(),
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
                        changed: {
                            old_email: eventBody.changed.email[0],
                            new_email: eventBody.changed.email[1]
                        }
                    };
                }
        if (memberfulEvent === 'member_deleted') {
                    return {
                        userId: userId(),
                        deleted: true
                    };
                }
        if (memberfulEvent === 'order.purchased' || memberfulEvent === 'order.refunded' || memberfulEvent === 'order.suspended' || memberfulEvent === 'order.completed') {
            subscription = _.get(order, 'subscriptions[0]', false);
            let subscriptionDetails = _.get(subscription, 'subscription', false);
            return {
                        orderTotal: order.total / 100,
                        value: order.total / 100,
                        total: order.total / 100, //my project doesn't require 'revenue'
                        currency: 'AUD',
                stripeCustomerId: member.stripe_customer_id,
                        checkoutId: order.uuid,
                        order_id: order.number,
                        order_status: order.status,
                        receipt: order.receipt,
                        products: {
                            product_id: subscription.id,
                            sku: subscription.id,
                            name: subscription.name,
                            price: subscription.price / 100,
                            category: subscriptionDetails.renewal_period,
                            activatedAt: subscriptionDetails.ativated_at,
                            createdAt: subscriptionDetails.created_at,
                            expiresAt: subscriptionDetails.expires_at
                        }
                    };
        }
        if (memberfulEvent === 'subscription.created' || memberfulEvent === 'subscription.updated' || memberfulEvent === 'subscription.renewed' || memberfulEvent === 'subscription.deactivated' || memberfulEvent === 'subscription.activated' || memberfulEvent === 'subscription.deleted') {
            let subscriptionPlan = _.get(subscription, 'subscription_plan', false);
            return {
                plan_id: subscriptionPlan.id,
                plan_price: subscriptionPlan.price_cents / 100,
                plan_name: subscriptionPlan.name,
                plan_interval_unit: subscriptionPlan.interval_unit,
                plan_interval_count: subscriptionPlan.interval_count,
                subscription_id: subscription.id,
                subscription_created: subscription.created_at,
                subscription_expires_at: subscription.expires_at,
                subscription_autorenew: subscription.autorenew,
                subscription_active: subscription.active
            };
        }
    };
    //identify
    let identify = {
        type: 'identify',
        userId: userId(),
        traits: traits
    };
    //add uid and email to track calls, usually email tools require it
    let defaults = {
        userId: userId(),
        email: member.email
    };
    let track = {
        type: 'track',
        event: eventName + " - Server",
        userId: userId(),
        properties: merge(eventProperties(), defaults)
    };
    returnValue = {events: [identify, track]};
    return (returnValue)
};
