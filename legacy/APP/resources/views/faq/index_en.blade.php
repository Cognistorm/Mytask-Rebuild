<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="{{asset('index.css')}}">
    <title>Mytast App</title>
    <style>
        p,
        ul {
            font-size: 18px;
        }
    </style>
</head>

<body>
<header class="flex-row">
    <div class="logo"><img src="{{asset('logo.png')}}" alt=""></div>
    <div class="lang">
        <a href="/ka/gita"><img src="{{asset('ge.svg')}}" alt=""></a>
    </div>
    <div class="logo"><img src="{{asset('gita.png')}}" alt=""></div>
</header>
<section class="grid">
    <div>
        <ul>
            <li><a href="#description" class="button">1.1 Project description / Story </a></li>
            <li><a href="#problem" class="button">2.1 Problem description</a></li>
            <li><a href="#problem-solving" class="button">2.2 Sollution</a></li>
            <li><a href="#market-opportunity-and-dynamics" class="button">4.1 Market opportunity and dynamics
                </a></li>
            <li><a href="#competitive-advantage" class="button">4.5 Competitive advantage</a></li>
            <li><a href="#team" class="button">Team</a></li>
        </ul>
    </div>
    <div id="description-text" class="text-container">
        <h1>How it started? / Where did the idea come from?</h1>
        <p>
            • Back in 2022, while working on one of our projects, our team engaged extensively with freelancers.
            During this process, we accumulated quite a few negative experiences, suffered both financially and
            emotionally, and most significantly- wasting valuable time.
        </p>

        <h1>Why?</h1>
        <p>• In our country and region, there are no platforms that regulate the relationship between the
            freelancer and the buyer. Therefore, reaching an agreement is mainly carried out through social
            networks, private messages, which is very risky and there are frequent cases when either the
            freelancer or the buyer is harmed.</p>

        <h1>How we came to the decision</h1>
        <p>• The current situation finally made us decide to establish the MYTASK platform, which provides a
            secure management of the relationship between the freelancer and the buyer, as an intermediary
            company.
        </p>
        <h1>What is new ?!</h1>
        <p>• On a global scale, we will create an algorithm to calculate the price fairness of the offered
            product, which will assign a status to the price of the statement in relation to the average price
            calculated by the algorithm, making it easier for the customer to make a decision.
        </p>
        <p>• Additionally, this algorithm will fix the problem faced by experienced professional freelancers. In
            some cases, their high prices cannot compete with the low prices of other freelancers. With the help
            of the algorithm, it will be possible to assign the same status to different prices, depending on
            the experience of the freelancer.
        </p>
        <p>• The innovation of intra-platform transfers will allow freelancers to work on a wider range of
            projects, hire other freelancers as subcontractors, and pay them with an internal transfer without
            any commission.
        </p>
        <p>• Our platform will re-evaluate registered freelancers from scratch. This means that a freelancer who
            is registered on other platforms and has a high rating will have to recreate the rating after moving
            to our platform. All freelancers will have the same opportunities, and everyone will be able to
            compete for a high ranking.
        </p>
        <p>• Finally, our company is committed to providing resources for the professional training of
            freelancers. Freelancers will be trained in areas where there will be a shortage of freelancers
            according to market research. As a result, we will have multifunctional and highly qualified
            freelancers who will be able to handle more orders, which will proportionally affect our income.
        </p>
    </div>
    <div id="problem-text" class="text-container">
        <div>
            <div>
                <h1>Problem description</h1>
                <ul>
                    <li>The absence of a safe space, as surprising as it may seem, is evident in our region,
                        where there is no platform that provides secure communication and relationships between
                        freelancers and buyers. Agreements are mostly made through social networks, which is
                        very risky, often resulting in harm to either the freelancer or the buyer.
                    </li>
                    <li>The absence of price regulation or assessment: We believe that freelancing should be
                        completely free, and every freelancer has the right to set the desired price for their
                        offer. However, this does not mean that the customer does not have the right to know how
                        fair the price is.
                    </li>
                    <li>The absence of internal transfers and Unfavorable environment for teamwork</li>
                    <li>Lack of focus on developing freelancer's professional skills.</li>
                </ul>
            </div>
            <div class="problem-img">
                <img src="{{asset('problems.png')}}" alt="">
            </div>
        </div>
    </div>
    <div id="problem-solving-text" class="text-container">
        <h1>We provide full protection of the relationship on all platforms. The corporation is as follows:
        </h1>
        <ul>
            <li>After the agreement, the buyer pays first.</li>
            <li>After fixing the payment, the freelancer can start to work on project.</li>
            <li>Our platform keeps the paid price locked.</li>
            <li>After completing, the freelancer sends the completed work to the customer through the platform.
            </li>
            <li>When the customer receives the order, the amount will be automatically unblocked, and the
                freelancer will be allowed to cash out his/her balance.
            </li>
        </ul>
        <h1>Price estimation algorithm</h1>
        <p>When you enter modern freelancing platforms, you will not come across features that determine the
            fairness of the price. Typically, a buyer chooses a freelancer based on feedback, ratings,
            portfolio, and price. But the data mentioned above does not allow us to know how fair the price
            offered by the freelancer is. It's common for experienced freelancers to protest the "drop" price of
            a particular service, which is prompted by the "low price" offered by newbie, low-rated freelancers.
            That's why we decided to create an algorithm that ensures fair price regulation and freelancer
            evaluation.</p>
        <ul>
            <li>First of all, we pay attention to the experience of all freelancers that they had before
                registering on our platform. The reason for this is that we cannot make a 100% accurate
                assessment of how much their data corresponds to reality.
            </li>
            <li>With this step, we will put all freelancers on equal terms.</li>
            <li>Accumulation of the rating will begin directly on the MYTASK platform by erasing the works,
                received evaluations, and feedback.
            </li>
            <li>The algorithm will also calculate a fair price for a specific product, but this price
                calculation will not be an arithmetic average from the prices of the products on the platform.
                In the process of price calculation, attention will be paid to the freelancer's experience and
                assessments.
            </li>
        </ul>
        <p>
            For example, if one freelancer makes a company logo for $50 in 3 days, and his ratings are very
            small, he also has no works done on our platform and no positive feedback - due to the low price,
            the algorithm may rate it as "good price".
        </p>
        <p>
            But when it comes to another freelancer who makes a logo for you based on the same data and asks for
            $200, our algorithm will take into account the high engagement, rating, and positive feedback of
            this freelancer, and his price will be rated as "good Price".</p>
        <p>
            Therefore, buyers will be given the opportunity to decide for themselves what type and quality of
            service they want to purchase from a freelancer. And the dispute between freelancers on the issue of
            price reduction will be resolved once and for all.</p>

        <h1>Function of subcontractor</h1>
        <p> It is often the case that a freelancer receives a task that requires multi-functionality and
            requires support from other freelancers. In this case, the freelancer will be able to hire another
            freelancer as a subcontractor for a specific project and pay him from his personal balance on our
            platform - through an internal transfer without any commission. By doing this, we will encourage
            freelancers to work as a team and expand their services.</p>

        <h1>Freelancer Skills developing</h1>
        <p>
            On today's platforms, you will come across offers of various courses, but training and care
            specifically tailored to the needs of a freelancer are virtually non-existent. For our customer
            retention and care, we want to create a freelancer training service. Based on market research, we
            can offer training to freelancers in sectors where there is a growing demand and a shortage of
            freelancers. In this way, we will get a stable number of freelancers with high competence and
            spectrum, depending on this we will be able to satisfy the market. Accordingly, the number and
            turnover of transactions performed on our platform will increase.
        </p>
    </div>
    <div id="market-opportunity-and-dynamics-text" class="text-container">
        <h1>Market dynamics and opportunities</h1>
        <p>
            • Freelancing has grown enormously in recent years. Approximately 1.57 billion people are
            self-employed around the globe (source: explodingtopics.com). We have regional market of 200,000
            Freelancers, which is our potential target group at the begining. That figure accounts for nearly
            half (46.6%) of the global workforce (Source: World Bank.com). Worldwide, the average freelancer
            earns $21 per hour (source: payoneer.com). Worldwide, the total freelance platform market is
            estimated to be worth $3.39 billion (source: globenewswire.com).
        </p>
        <p>
            • Despite the robust growth in freelance work, freelance platforms are responsible for only 1-3% of
            total global employment. This means there is plenty of room for continued growth. By 2027, the
            global freelance platform market is projected to reach $9.19 billion. The freelance market CAGR is
            predicted to be 15.3% during 2021-2027 (source: globenewswire.com).
            It is clear that freelancing has become an integral part of the worlds workforce. This is especially
            true due to the increased amount of work that can be accomplished remotely.

        </p>

        <div class="market-img">
            <img src="{{asset('market.png')}}" alt="">
        </div>
    </div>
    <div id="competitive-advantage-text" class="text-container">
        <h1>Competitive advantage</h1>
        <p>• On a regional scale, compared to our indirect competitors, our advantage is expressed by ensuring
            the security of the relationship between the freelancer and the buyer and by providing a wide range
            of choices.
        </p>
        <p>• On a global scale, we will implement an algorithm to calculate the price fairness of the offered
            product, which will assign a status to the price of the statements in relation to the average price
            calculated by the algorithm, making it easier for the customer to make a decision.
        </p>
        <p>• Additionally, this algorithm will address the problem faced by experienced professional
            freelancers. In some cases, their high prices cannot compete with the low prices of other
            freelancers. With the help of the algorithm, it will be possible to assign the same status to
            different prices, depending on the experience of the freelancer.
        </p>
        <div><img src="{{asset('price.png')}}" alt=""></div>
        <p>• The innovation of intra-platform transfers will allow freelancers to work on a wider range of
            projects, hire other freelancers as subcontractors, and pay them with an internal transfer without
            any commission.
        </p>
        <p>• Our platform will re-evaluate registered freelancers from scratch. This means that a freelancer who
            is registered on other platforms and has a high rating will have to rewrite the rating after moving
            to our platform. All freelancers will have the same opportunities, and everyone will be able to
            compete for a high ranking.
        </p>
        <p>• Finally, our company is committed to providing resources for the professional training of
            freelancers. Freelancers will be trained in areas where there will be a shortage of freelancers
            according to market research. As a result, we will have multifunctional and highly qualified
            freelancers who will be able to handle more orders, which will proportionally affect our income.
        </p>
    </div>
    <div id="team-text" class="text-container">
        <img src="{{asset('Team-Member.png')}}" alt="">
    </div>
</section>

<script>
    document.querySelectorAll('.button').forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetText = document.getElementById(targetId + '-text');

            document.querySelectorAll('.text-container').forEach(container => {
                container.style.display = 'none';
            });

            if (targetText) {
                targetText.style.display = 'block';
            }
            window.location.hash = targetId;
        });
    });
    window.addEventListener('DOMContentLoaded', () => {
        const hash = window.location.hash.substring(1);
        const targetText = document.getElementById(hash + '-text');

        document.querySelectorAll('.text-container').forEach(container => {
            container.style.display = 'none';
        });
        if (targetText) {
            targetText.style.display = 'block';
        }
    });
</script>
</body>

</html>