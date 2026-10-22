import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

func fail(_ message:String)->Never {fputs(message,stderr);exit(1)}
do {
 let data=FileHandle.standardInput.readDataToEndOfFile()
 guard let input=try JSONSerialization.jsonObject(with:data) as? [String:Any],let url=input["url"] as? String,let encoded=url.split(separator:",",maxSplits:1).last,let bytes=Data(base64Encoded:String(encoded)),let source=CGImageSourceCreateWithData(bytes as CFData,nil) else {fail("Choose a valid photo.")}
 guard let properties=CGImageSourceCopyPropertiesAtIndex(source,0,nil) as? [CFString:Any],let sw=properties[kCGImagePropertyPixelWidth] as? Int,let sh=properties[kCGImagePropertyPixelHeight] as? Int,sw>0,sh>0,sw<=40000000/sh else {fail("Choose a photo under 40 megapixels.")}
 let options:[CFString:Any]=[kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceCreateThumbnailWithTransform:true,kCGImageSourceThumbnailMaxPixelSize:1600]
 guard let cg=CGImageSourceCreateThumbnailAtIndex(source,0,options as CFDictionary) else {fail("This photo could not be read.")}
 let handler=VNImageRequestHandler(cgImage:cg,options:[:])
 let faces=VNDetectFaceRectanglesRequest()
 try handler.perform([faces])
 guard let observations=faces.results,observations.count==1,let face=observations.first else {fail("Use a clear photo of one face. Multiple faces or no clear face were found.")}
 let request=VNGenerateForegroundInstanceMaskRequest()
 try handler.perform([request])
 guard let observation=request.results?.first,!observation.allInstances.isEmpty else {fail("The face could not be separated. Try a clearer photo or upload a transparent cutout.")}
 let mask=try observation.generateScaledMaskForImage(forInstances:observation.allInstances,from:handler)
 let image=CIImage(cgImage:cg),extent=image.extent
 let filtered=image.applyingFilter("CIBlendWithMask",parameters:[kCIInputBackgroundImageKey:CIImage(color:.clear).cropped(to:extent),kCIInputMaskImageKey:CIImage(cvPixelBuffer:mask)])
 let rect=CGRect(x:face.boundingBox.minX*extent.width,y:face.boundingBox.minY*extent.height,width:face.boundingBox.width*extent.width,height:face.boundingBox.height*extent.height)
 // Include hair above the forehead, while excluding shoulders below the chin.
 let head=CGRect(x:rect.minX-rect.width*0.35,y:rect.minY+rect.height*0.02,width:rect.width*1.70,height:rect.height*1.56).intersection(extent).integral
 let context=CIContext()
 guard let cut=context.createCGImage(filtered,from:head),let output=CGContext(data:nil,width:600,height:720,bitsPerComponent:8,bytesPerRow:2400,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue) else {fail("Could not prepare the cutout.")}
 let ratio=min(560/head.width,680/head.height),w=head.width*ratio,h=head.height*ratio
 let target=CGRect(x:(600-w)/2,y:(720-h)/2,width:w,height:h)
 output.interpolationQuality = .high
 // Softly taper to the jaw: the foreground mask retains the actual outer hair silhouette.
 output.saveGState();output.addEllipse(in:target);output.clip();output.draw(cut,in:target);output.restoreGState()
 guard let raw=output.makeImage(),let pixels=output.data?.assumingMemoryBound(to:UInt8.self) else {fail("Could not draw the cutout.")}
 var left=600,right=0,bottom=720,top=0
 for y in 0..<720 {for x in 0..<600 {if pixels[y*2400+x*4+3]>8 {left=min(left,x);right=max(right,x);bottom=min(bottom,y);top=max(top,y)}}}
 guard right>left,top>bottom else {fail("No usable face cutout was found.")}
 let trim=CGRect(x:max(0,left-3),y:max(0,bottom-3),width:min(600-left+3,right-left+7),height:min(720-bottom+3,top-bottom+7))
 guard let result=raw.cropping(to:trim) else {fail("Could not trim the cutout.")}
 let png=NSMutableData();guard let dest=CGImageDestinationCreateWithData(png,UTType.png.identifier as CFString,1,nil) else {fail("Could not encode the cutout.")}
 CGImageDestinationAddImage(dest,result,nil);guard CGImageDestinationFinalize(dest) else {fail("Could not save the cutout.")}
 let response:[String:Any]=["url":"data:image/png;base64,"+(png as Data).base64EncodedString(),"width":result.width,"height":result.height,"cutout":true,"method":"local-vision-face"]
 let resultData=try JSONSerialization.data(withJSONObject:response);FileHandle.standardOutput.write(resultData)
} catch {fail("Local face separation could not finish. Try a clearer photo or upload a transparent face PNG.")}
