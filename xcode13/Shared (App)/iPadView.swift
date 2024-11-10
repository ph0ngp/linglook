//
//  iPadView.swift
//  LingLook
//
//  Created by Phong Phan on 11/9/24.
//


import SwiftUI

struct iPadView: View {
    @State private var currentPage = 0
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Getting started with")
                .font(.title2) +
            Text(" LingLook")
                .font(.title2)
                .bold()
            
//            TabView(selection: $currentPage) {
//                TutorialPage(
//                    image: "tutorial-ipad-1",
//                    text: "Open Safari"
//                )
//                .tag(0)
//                
//                TutorialPage(
//                    image: "tutorial-ipad-2",
//                    text: "Select the extensions icon in the address bar"
//                )
//                .tag(1)
//                
//                TutorialPage(
//                    image: "tutorial-ipad-3",
//                    text: "Enable LingLook"
//                )
//                .tag(2)
//            }
//            .tabViewStyle(PageTabViewStyle())
//            .indexViewStyle(PageIndexViewStyle(backgroundDisplayMode: .always))
        }
        .padding()
    }
}

#if DEBUG
struct iPadView_Previews: PreviewProvider {
    static var previews: some View {
        iPadView()
    }
}
#endif
